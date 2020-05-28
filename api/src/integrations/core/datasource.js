'use strict';

const QS = require('qs');
const integrationUtils = require('../integration-utils');
const defaultLog = require('../../utils/logger')('core-datasource');
const MAX_PAGE_SIZE = Number.MAX_SAFE_INTEGER;

const CORE_API_HOSTNAME = process.env.CORE_API_HOSTNAME || 'eagle-prod.pathfinder.gov.bc.ca';
const CORE_API_SEARCH_PATHNAME = process.env.CORE_API_SEARCH_PATHNAME || '/api/public/search';

/**
 * Supported NRPTI record types for Core data.
 */
const RECORD_TYPE = Object.freeze({
  Mine: {
    _schemaName: 'Mine',
    recordControllerName: 'mines'
  },
};

class CoreDataSource {
  /**
   * Creates an instance of CoreDataSource.
   *
   * @param {*} taskAuditRecord audit record hook for this import instance
   * @param {*} auth_payload information about the user account that started this update.
   * @param {*} [params=null] params to filter epic records (optional).
   * @memberof CoreDataSource
   */
  constructor(taskAuditRecord, auth_payload, params = null) {
    this.taskAuditRecord = taskAuditRecord;
    this.auth_payload = auth_payload;
    this.params = params || {};

    // Set initial status
    this.status = { itemsProcessed: 0, itemTotal: 0, status: null, individualRecordStatus: [] };
  }

  // This requires no auth setup, so just call the local updater function.
  async run() {
    defaultLog.info('run - update core datasource');
    await this.taskAuditRecord.updateTaskRecord({ status: 'Running' });

    return await this.updateRecords();
  }

  /**
   * Main function that runs all necessary operations to update Core records.
   *
   * @async
   * @memberof CoreDataSource
   */
  async updateRecords() {
    try {
      // Build request url
      const queryParams = {
        dataset: 'Document',
        populate: false,
        pageSize: MAX_PAGE_SIZE,
        pageNum: 0
      };
      const url = this.getIntegrationUrl(CORE_API_HOSTNAME, CORE_API_SEARCH_PATHNAME, queryParams);

      this.status.url = url.href;

      // Get Core records
      const data = await integrationUtils.getRecords(url);

      // Get records from response
      const coreRecords = data && data[0] && data[0].searchResults;

      // Failed to find any epic records
      if (!coreRecords || !coreRecords.length) {
        this.status.message = 'updateRecords - no records found';
        return;
      }

      // Get the record type specific utils, that contain the unique transformations, etc, for this record type.
      const recordTypeUtils = new (require('./mines-utils'))(this.auth_payload, RECORD_TYPE.Mine);

      if (!recordTypeUtils) {
        this.status.message = 'updateRecords - no record type utils found';
        return;
      }

      this.status.itemTotal += coreRecords.length;
      await this.taskAuditRecord.updateTaskRecord({ itemTotal: this.status.itemTotal });

      // update each record in batches so as not to overload the EPIC api
      await this.batchProcessRecords(recordTypeUtils, coreRecords);
    } catch (error) {
      this.status.message = 'updateRecords - unexpected error';
      this.status.error = error.message;

      // Do not re-throw error, as a single failure is not cause to stop the other record types from processing
      defaultLog.error(`updateRecords - unexpected error: ${error.message}`);
    }
  }

  /**
   * Runs processRecord() on each coreRecord, in batches.
   *
   * Batch size configured by env variable `CORE_IMPORT_BATCH_SIZE` if it exists, or 100 by default.
   *
   * @param {*} recordTypeUtils record type specific utils that contain the unique transformations, etc, for this type.
   * @param {*} coreRecords core records to process.
   * @memberof EpicDataSource
   */
  async batchProcessRecords(recordTypeUtils, coreRecords) {
    try {
      let batchSize = process.env.CORE_IMPORT_BATCH_SIZE || 100;

      let promises = [];
      for (let i = 0; i < this.csvRows.length; i++) {
        promises.push(this.processRecord(this.csvRows[i]));

        if (i % batchSize === 0 || i === this.csvRows.length - 1) {
          await Promise.all(promises);
          promises = [];
        }
      }
    } catch (error) {
      this.status.message = 'batchProcessRecords - unexpected error';
      this.status.error = error.message;

      defaultLog.error(`batchProcessRecords - unexpected error: ${error.message}`);
    }
  }

  /**
   * Process a core record.
   *
   * For this record:
   * - Transform into a NRPTI record
   * - Persist to the database
   *   - Either performing a create or update
   *
   * @param {*} recordTypeUtils record type specific utils that contain the unique transformations, etc, for this type.
   * @param {*} coreRecord core record to process.
   * @returns {object} status of the process operation for this record.
   * @memberof CoreDataSource
   */
  async processRecord(recordTypeUtils, coreRecord) {
    // set status defaults
    let recordStatus = {};

    try {
      if (!recordTypeUtils) {
        throw Error('processRecord - required recordTypeUtils is null.');
      }

      if (!coreRecord) {
        throw Error('processRecord - required coreRecord is null.');
      }

      // Perform any data transformations necessary to convert core record to NRPTI record
      const nrptiRecord = await recordTypeUtils.transformRecord(coreRecord);

      // Check if this record already exists
      const existingRecord = await recordTypeUtils.findExistingRecord(nrptiRecord);

      let savedRecords = null;
      if (existingRecord) {
        savedRecords = await recordTypeUtils.updateRecord(nrptiRecord, existingRecord);
      } else {
        // Create NRPTI master record OR update existing NRPTI master record and its flavours (if any)
        savedRecords = await recordTypeUtils.createRecord(nrptiRecord);
      }

      if (savedRecords && savedRecords.length > 0 && savedRecords[0].status === 'success') {
        this.status.itemsProcessed++;

        await this.taskAuditRecord.updateTaskRecord({ itemsProcessed: this.status.itemsProcessed });
      } else {
        throw Error('processRecord - savedRecord is null.');
      }
    } catch (error) {
      recordStatus.coreId = coreRecord && coreRecord._id;
      recordStatus.message = 'processRecord - unexpected error';
      recordStatus.error = error.message;

      // only add individual record status when an error occurs
      this.status.individualRecordStatus.push(recordStatus);

      // Do not re-throw error, as a single failure is not cause to stop the other records from processing
      defaultLog.error(`processRecord - unexpected error: ${error.message}`);
    }
  }

  /**
   * Builds the integration URL string.
   *
   * Note: assumes HTTPS.
   *
   * @param {string} hostname the url hostname. Example: 'www.example.com'
   * @param {string} pathname the url pathname. Example: '/api/some/route'
   * @param {object} queryParams the url query params. Example: { type: 'document', other: true }
   * @returns {URL} integration URL (see https://nodejs.org/api/url.html#url_url)
   * @memberof CoreDataSource
   */
  getIntegrationUrl(hostname, pathname, queryParams) {
    const query = QS.stringify(queryParams);
    const path = `${pathname}?${query}`;
    const url = new URL(path, `https://${hostname}`);

    return url;
  }
}

module.exports = CoreDataSource;
