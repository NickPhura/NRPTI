import { Component } from '@angular/core';
import { FactoryService } from '../../services/factory.service';
import { ICsvTaskParams } from '../../services/task.service';

@Component({
  selector: 'app-import-csv',
  templateUrl: './import-csv.component.html',
  styleUrls: ['./import-csv.component.scss']
})
export class ImportCSVComponent {
  public dataSourceType: string = null;
  public recordType: string = null;
  public csvFiles: File[] = [];

  public recordSaveObjects: object[] = [];

  constructor(public factoryService: FactoryService) {}

  onDataSourceTypeChange(dataSourceType: string) {
    this.dataSourceType = dataSourceType;
  }

  onRecordTypeChange(recordType: string) {
    this.recordType = recordType;
  }

  onFileChange(files: File[]) {
    this.csvFiles = files;
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

  async startJob() {
    if (!this.dataSourceType) {
      return null;
    }

    if (!this.recordType) {
      return null;
    }

    if (!this.csvFiles || !this.csvFiles.length) {
      return null;
    }

    const csvTaskParams: ICsvTaskParams = {
      dataSourceType: this.dataSourceType,
      recordType: this.recordType,
      upfile: this.csvFiles[0]
    };

    const response = await this.factoryService.startCsvTask(csvTaskParams).toPromise();

    console.log('response', response);
  }
}
