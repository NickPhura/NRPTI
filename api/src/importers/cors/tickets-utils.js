const BaseRecordUtils = require('./base-record-utils');
const Utils = require('./utils/csv-utils');

const DateFormat = 'DD/MM/YYYY';
const PenaltyType = 'Fined';
const PenaltyValueType = 'Dollars';

/**
 * CORS csv Tickets record handler.
 *
 * @class Tickets
 */
class Tickets extends BaseRecordUtils {
  /**
   * Creates an instance of Tickets.
   *
   * @param {*} auth_payload user information for auditing
   * @param {*} recordType an item from record-type-enum.js -> RECORD_TYPE
   * @param {*} csvRow an array containing the values from a single csv row.
   * @memberof Tickets
   */
  constructor(auth_payload, recordType, csvRow) {
    super(auth_payload, recordType, csvRow);
  }

  /**
   * Convert the csv row values array into the object expected by the API record post/put controllers.
   *
   * @returns a ticket object matching the format expected by the API record post/put controllers.
   * @memberof Tickets
   */
  async transformRecord(csvRow) {
    if (!csvRow) {
      throw Error('transformRecord - required csvRow must be non-null.');
    }

    const ticket = { ...(await super.transformRecord(csvRow)) };

    // ticket['_schemaName'] = 'Ticket';
    // ticket['_sourceRefCorsId'] = csvRow['case number'] || ''; // TODO need a unique identifier (caseNumber is not unique).

    ticket['recordType'] = 'Ticket';
    ticket['dateIssued'] = (csvRow['date'] && Utils.parseDate(csvRow['date'], DateFormat)) || null;
    // ticket['issuingAgency'] = null;
    // ticket['author'] = null;

    ticket['legislation'] = {
      act: csvRow['act'] || '',
      regulation: Utils.parseRegulationNumber(csvRow['reg_num'] || ''),
      section: csvRow['section'] || '',
      subSection: csvRow['sub_section'] || '',
      paragraph: csvRow['paragraph'] || ''
    };

    ticket['offence'] = csvRow['description'] || '';

    const offenderType = (csvRow['offender type'] && Utils.parseOffenderType(csvRow['offender type'])) || '';

    if (offenderType === 'Individual') {
      ticket['issuedTo'] = {
        type: offenderType,
        firstName: csvRow['first name'] || '',
        middleName: csvRow['middle name'] || '',
        lastName: csvRow['last name'] || '',
        dateOfBirth: (csvRow['birth date'] && Utils.parseDate(csvRow['birth date'], DateFormat)) || null
      };
    }

    if (offenderType === 'Company') {
      ticket['issuedTo'] = {
        companyName: csvRow['business name'] || ''
      };
    }

    ticket['location'] = csvRow['location'] || '';

    ticket['penalties'] = [
      {
        type: PenaltyType,
        penalty: {
          type: PenaltyValueType,
          value: (csvRow['penalty'] && Number(csvRow['penalty'])) || null
        },
        description: ''
      }
    ];

    ticket['summary'] = csvRow['description'] || '';

    // ticket['sourceDateAdded'] = null;
    // ticket['sourceDateUpdated'] = null;
    // ticket['sourceSystemRef'] = 'cors-csv';

    ticket['addRole'] = 'public';

    // TODO can we publish these??
    ticket['TicketLNG'] = {
      addRole: 'public'
    };

    ticket['TicketNRCED'] = {
      addRole: 'public'
    };

    return ticket;
  }
}

module.exports = Tickets;
