import { PENALTY_TYPE } from '../../../../../../common/src/app/models/master/common-models/penalty';
import { ENTITY_TYPE } from '../../../../../../common/src/app/models/master/common-models/entity';
import { ICSVRecordModel } from './csv-record-model';
import { Utils } from './csv-utils';

const DateFormat = 'DD/MM/YYYY';
const PenaltyType = 'Fined'; // see  record-constnats -> courtConvictionSubtypePicklist
const PenaltyValueType = PENALTY_TYPE.Dollars;

/**
 * Ticket CSV model.
 *
 * @export
 * @class TicketsCSV
 */
export class CSVTicket implements ICSVRecordModel {
  date: Date;
  offenderType: string;
  firstName: string;
  middleName: string;
  lastName: string;
  businessName: string;
  location: string;
  act: string;
  regNumber: string;
  section: string;
  subSection: string;
  paragraph: string;
  penalty: number;
  description: string;
  caseNumber: string; // needs to be unique for sourceSystemRef
  dateOfBirth: Date;
  sourceSystem: string;

  constructor(csvRowArray: string[]) {
    this.date = (csvRowArray && csvRowArray[0] && Utils.parseDate(csvRowArray[0], DateFormat)) || null;
    this.offenderType = (csvRowArray && csvRowArray[1] && Utils.parseOffenderType(csvRowArray[1])) || '';
    this.firstName = (csvRowArray && csvRowArray[2]) || '';
    this.middleName = (csvRowArray && csvRowArray[3]) || '';
    this.lastName = (csvRowArray && csvRowArray[4]) || '';
    this.businessName = (csvRowArray && csvRowArray[5]) || '';
    this.location = (csvRowArray && csvRowArray[6]) || '';
    this.act = (csvRowArray && csvRowArray[7]) || '';
    this.regNumber = (csvRowArray && csvRowArray[8]) || '';
    this.section = (csvRowArray && csvRowArray[9]) || '';
    this.subSection = (csvRowArray && csvRowArray[10]) || '';
    this.paragraph = (csvRowArray && csvRowArray[11]) || '';
    this.penalty = (csvRowArray && csvRowArray[12] && Number(csvRowArray[12])) || null;
    this.description = (csvRowArray && csvRowArray[13]) || '';
    this.caseNumber = (csvRowArray && csvRowArray[14]) || null;
    this.dateOfBirth = (csvRowArray && csvRowArray[15] && Utils.parseDate(csvRowArray[15], DateFormat)) || null;
    this.sourceSystem = (csvRowArray && csvRowArray[16]) || '';
  }

  /**
   * Convert the TicketCSV model into the object expected by the API when saving/updating a record.
   *
   * @memberof TicketsCSV
   */
  getSaveObject(): object {
    const ticket = {};

    ticket['_schemaName'] = 'Ticket';
    ticket['_sourceRefId'] = null;

    ticket['recordType'] = 'Ticket';
    ticket['dateIssued'] = this.date;
    ticket['issuingAgency'] = null;
    ticket['author'] = null;

    ticket['legislation'] = {
      act: this.act,
      regulation: Utils.parseRegulationNumber(this.regNumber),
      section: this.section,
      subSection: this.subSection,
      paragraph: this.paragraph
    };

    ticket['offence'] = this.description;

    if (this.offenderType === ENTITY_TYPE.Individual) {
      ticket['issuedTo'] = {
        type: this.offenderType,
        firstName: this.firstName,
        middleName: this.middleName,
        lastName: this.lastName,
        dateOfBirth: this.dateOfBirth
      };
    }

    if (this.offenderType === ENTITY_TYPE.Company) {
      ticket['issuedTo'] = {
        companyName: this.businessName
      };
    }

    ticket['location'] = null;

    ticket['penalties'] = [
      {
        type: PenaltyType,
        penalty: {
          type: PenaltyValueType,
          value: this.penalty
        },
        description: ''
      }
    ];

    ticket['sourceDateAdded'] = null;
    ticket['sourceDateUpdated'] = null;
    ticket['sourceSystemRef'] = null;

    ticket['addRole'] = 'public';

    // TODO can we publish these??
    ticket['TicketLNG'] = {
      addRole: 'public',
      issuedTo: {
        addRole: 'public' // TODO check anonymous/publish logic
      }
    };

    ticket['TicketNRCED'] = {
      addRole: 'public',
      issuedTo: {
        addRole: 'public' // TODO check anonymous/publish logic
      }
    };

    return ticket;
  }
}
