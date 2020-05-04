const moment = require('moment');
const { regulationNumbersMappedToRegulations } = require('./csv-constants');

/**
 * Parse the first row of an array of csv rows into an array of column header values.
 *
 * @param {string[]} csvRows array of all csv rows
 * @returns {string[]} array of column header values.
 */
exports.getHeaderRowArray = function(csvRows) {
  if (!csvRows || !csvRows.length) {
    return null;
  }

  return String(csvRows[0]).split(',');
};

/**
 * Parse the raw array of csv row strings into a 2D array, where each inner array contains the column values for a
 * row.
 *
 * @param {*} csvRows
 * @param {*} csvHeaderRowLength
 * @returns {string[][]}
 */
exports.getRecordRowsArraysFromCSVFile = function(csvRows, csvHeaderRowLength) {
  const csvRecordsArray = [];

  for (const csvRow of csvRows) {
    const csvRowArray = String(csvRow).split(',');

    if (csvRowArray.length !== csvHeaderRowLength) {
      // show warning?
    }

    csvRecordsArray.push(csvRowArray);
  }

  return csvRecordsArray;
};

/**
 * Creates a formatted date from the dateString and dateFormat.
 *
 * @param {*} dateString
 * @param {*} dateFormat
 * @returns the formatted date, or null if invalid dateString or dateFormat provided.
 */
exports.parseDate = function(dateString, dateFormat) {
  if (!dateString || !dateFormat) {
    return null;
  }

  const date = moment(dateString, dateFormat);

  if (!date.isValid()) {
    return null;
  }

  return date.toDate();
};

/**
 * Converts the regulation identifier into the corresponding full regulation string used by NRPTI.
 *
 * @param {*} regNumber
 * @returns the corresponding full regulation string, or null if invalid/unknown regNumber provided.
 */
exports.parseRegulationNumber = function(regNumber) {
  if (!regNumber) {
    return null;
  }

  const regulation = regulationNumbersMappedToRegulations[regNumber];

  if (!regulation) {
    return null;
  }

  return regulation;
};

/**
 * Converts the offenderType into the corresponding entity type used by NRPTI.
 *
 * @param {*} offenderType
 * @returns the corresponding entity type string, or null if invalid offenderType provided.
 */
exports.parseOffenderType = function(offenderType) {
  if (!offenderType) {
    return null;
  }

  if (offenderType === 'Person') {
    return 'Individual';
  }

  if (offenderType === 'Company') {
    return 'Company';
  }

  return null;
};
