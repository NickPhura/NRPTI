import moment from 'moment';
import { CSVConstants } from './csv-constants';
import { ENTITY_TYPE } from '../../../../../../common/src/app/models/master/common-models/entity';

/**
 * CSV import utils.
 *
 * @export
 * @class Utils
 */
export class Utils {
  public static parseDate(dateString: string, dateFormat: string): Date {
    if (!dateString) {
      return null;
    }

    const date = moment(dateString, dateFormat);

    if (!date.isValid()) {
      return null;
    }

    return date.toDate();
  }

  public static parseRegulationNumber(regNumber): string {
    if (!regNumber) {
      return null;
    }

    const regulation = CSVConstants.regulationNumbersMappedToRegulations[regNumber];

    if (!regulation) {
      return null;
    }

    return regulation;
  }

  public static parseOffenderType(offenderType: string): string {
    if (!offenderType) {
      return null;
    }

    if (offenderType === 'Person') {
      return ENTITY_TYPE.Individual;
    }

    if (offenderType === 'Company') {
      return ENTITY_TYPE.Company;
    }

    return null;
  }
}
