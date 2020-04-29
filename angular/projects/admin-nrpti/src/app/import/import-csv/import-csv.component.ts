import { Component } from '@angular/core';

import { CSVTicket } from './csv-utils/csv-ticket';
import { ICSVRecordModel } from './csv-utils/csv-record-model';
import { FactoryService } from '../../services/factory.service';

@Component({
  selector: 'app-import-csv',
  templateUrl: './import-csv.component.html',
  styleUrls: ['./import-csv.component.scss']
})
export class ImportCSVComponent {
  public recordType: string = null;
  public csvFiles: File[] = [];

  public recordSaveObjects: object[] = [];

  constructor(public factoryService: FactoryService) {}

  onRecordTypeChange(recordType: string) {
    this.recordType = recordType;
  }

  onFileChange(files: File[]) {
    this.csvFiles = files;
    console.log('csvFile', this.csvFiles[0]);
  }

  onFileDelete(file: File) {
    if (!file) {
      return;
    }

    if (!this.csvFiles.includes(file)) {
      return;
    }

    this.csvFiles = this.csvFiles.filter(csvFile => csvFile.name !== file.name);
  }

  checkFileForErrors() {
    if (!this.csvFiles[0]) {
      return;
    }

    try {
      const fileReader = new FileReader();

      fileReader.onload = () => {
        const csvData = fileReader.result;
        if (!csvData) {
          return;
        }

        const csvRows = (csvData as string).split(/\r\n|\n/);

        const csvHeaderRowArray = this.getHeaderRowArray(csvRows);

        // remove header row from data rows
        csvRows.splice(0, 1);

        const csvRecordRowsArrays: string[][] = this.getRecordRowsArraysFromCSVFile(csvRows, csvHeaderRowArray.length);

        this.recordSaveObjects = [];
        csvRecordRowsArrays.map((csvRecordRowArray: string[]) => {
          if (!csvRecordRowArray || !csvRecordRowArray.length) {
            return null;
          }

          const recordCSVModel = this.getCSVRecordModelInstance(csvRecordRowArray);
          if (!recordCSVModel) {
            return null;
          }

          const recordSaveObject = recordCSVModel.getSaveObject();
          if (!recordSaveObject) {
            return null;
          }

          this.recordSaveObjects.push(recordSaveObject);
        });

        console.log('recordSaveObjects', this.recordSaveObjects);
      };

      fileReader.readAsText(this.csvFiles[0]);
    } catch (error) {
      console.log(`Error: ${error}`);
      alert(`Error: ${error}`);
    }
  }

  saveRecords() {
    switch (this.recordType) {
      case 'Administrative Sanctions':
        return null;
      case 'Court Convictions':
        return null;
      case 'Tickets':
        return this.factoryService.recordService.createRecord({ tickets: this.recordSaveObjects }).toPromise();
      default:
        return null;
    }
  }

  /**
   * Parse the first row of the csv into an array of column header values.
   *
   * @param {string[]} csvRows
   * @returns {string[]}
   * @memberof ImportCSVComponent
   */
  getHeaderRowArray(csvRows: string[]): string[] {
    if (!csvRows) {
      return null;
    }

    return (csvRows[0] as string).split(',');
  }

  /**
   * Parse the raw array of csv row strings into a 2D array, where each inner array contains the column values for a
   * row.
   *
   * @param {*} csvRows
   * @param {*} csvHeaderRowLength
   * @returns {string[][]}
   * @memberof ImportCSVComponent
   */
  getRecordRowsArraysFromCSVFile(csvRows: any, csvHeaderRowLength: any): string[][] {
    const csvRecordsArray = [];

    for (const csvRow of csvRows) {
      const csvRowArray: string[] = (csvRow as string).split(',');

      if (csvRowArray.length !== csvHeaderRowLength) {
        // show warning?
      }

      csvRecordsArray.push(csvRowArray);
    }

    return csvRecordsArray;
  }

  /**
   * Get a new instance of a csv model.
   *
   * @param {string[]} csvRecordRowArray
   * @returns {ICSVRecordModel}
   * @memberof ImportCSVComponent
   */
  getCSVRecordModelInstance(csvRecordRowArray: string[]): ICSVRecordModel {
    switch (this.recordType) {
      case 'Administrative Sanctions':
        return null;
      case 'Court Convictions':
        return null;
      case 'Tickets':
        return new CSVTicket(csvRecordRowArray);
      default:
        return null;
    }
  }
}
