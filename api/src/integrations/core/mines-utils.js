'use strict';

const BaseRecordUtils = require('./base-record-utils');
/**
 * CORE Mine record handler.
 *
 * @class Mines
 */
class Mines extends BaseRecordUtils {
  /**
   * Creates an instance of Mines.
   *
   * @param {*} auth_payload user information for auditing
   * @param {*} recordType an item from record-type-enum.js -> RECORD_TYPE
   * @memberof Mines
   */
  constructor(auth_payload, recordType) {
    super(auth_payload, recordType);
  }

  /**
   * Transform an CORE mine record into a NRPTI Mine record.
   *
   * @param {object} mineRecord Core mine record (required)
   * @returns {Order} NRPTI mine record.
   * @throws {Error} if record is not provided.
   * @memberof Mines
   */
  async transformRecord(mineRecord) {
    if (!mineRecord) {
      throw Error('transformRecord - required record must be non-null.');
    }

    return {
      ...(await super.transformRecord(mineRecord))
    };
  }
}

module.exports = Mines;
