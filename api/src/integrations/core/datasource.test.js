const DataSource = require('./datasource');
const defaultLogger = require('../../utils/logger')('core-datasource');
const integrationUtils = require('../integration-utils');

describe('Core DataSource', () => {
  describe('constructor', () => {
    it('sets taskAuditRecord', () => {
      const dataSource = new DataSource('testing');
      expect(dataSource.taskAuditRecord).toEqual('testing');
    });

    it('sets default status fields', () => {
      const dataSource = new DataSource();
      expect(dataSource.status).toEqual({
        itemsProcessed: 0,
        itemTotal: 0,
        individualRecordStatus: []
      });
    });
  });

  describe('updateRecords', () => {
    it('re-throws a caught error', async () => {
      // mock function to throw error
      const mockGetAllRecordData = jest.fn(() => {
        throw new Error('Test error');
      });

      const dataSource = new DataSource();
      dataSource.getAllRecordData = mockGetAllRecordData;

      await expect(dataSource.updateRecords()).rejects.toThrow('Test error');
    });

    it('returns early if no core records are found', async () => {
      jest.spyOn(defaultLogger, 'info');

      // mock function to to return no records
      const mockGetAllRecordData = jest.fn(() => {
        return [];
      });

      const dataSource = new DataSource();
      dataSource.getAllRecordData = mockGetAllRecordData;

      await dataSource.updateRecords();
  
      expect(defaultLogger.info).toHaveBeenCalledWith('updateRecords - no records found to update');
    });
  });


  describe('getAllRecordData', () => {
    it('re-throws a caught error', async () => {
      integrationUtils.getRecords = jest.fn(() => {
        throw new Error('Test error');
      })

      const mockGetIntegrationUrl = jest.fn(() => {
        return 'test/path';
      });

      const dataSource = new DataSource();
      dataSource.getIntegrationUrl = mockGetIntegrationUrl;

      await expect(dataSource.getAllRecordData()).rejects.toThrow('Test error');
    });
  });

  describe('processRecords', () => {
    it('calls `processRecord` on all records', async () => {
      integrationUtils.getRecords = jest.fn(() => ({
        records: []
      }));

      const mockGetIntegrationUrl = jest.fn(() => {
        return 'test/path';
      });

      const dataSource = new DataSource();
      dataSource.getIntegrationUrl = mockGetIntegrationUrl;

      jest.spyOn(dataSource, 'processRecord').mockImplementation((utils, commodities, record) => {
        return Promise.resolve();
      });

      // Number of elements in array should be number of times 
      // processRecord is called.
      const mockRecords = [
        {
          name: 'test'
        },
        {
          name: 'test2'
        }
      ];

      await dataSource.processRecords({}, mockRecords);

      expect(dataSource.processRecord).toHaveBeenCalledTimes(mockRecords.length);
    });

    it('throws error if missing recordTypeUtils param', async () => {
      const dataSource = new DataSource();
      await expect(dataSource.processRecords(null, [])).rejects.toThrow('processRecords - required recordTypeUtils is null.');
    });

    it('throws error if missing coreRecords param', async () => {
      const dataSource = new DataSource();
      await expect(dataSource.processRecords({}, null)).rejects.toThrow('processRecords - required coreRecords is null.');
    });
  });

  describe('processRecord', () => {
    it('silently handles thrown error', async () => {
      const mockRecordUtils = {
        transformRecord: jest.fn(() => {
          throw new Error('Test error')
        })
      };

      const dataSource = new DataSource();
      await expect(dataSource.processRecord(mockRecordUtils, [], {})).resolves.not.toThrow();
    });

    it('handles error if missing recordTypeUtils param', async () => {
      const dataSource = new DataSource();
      dataSource.processRecord(null, [], {});
      expect(dataSource.status.individualRecordStatus[0].error).toEqual('processRecord - required recordTypeUtils is null.');
    });

    it('handles error if missing coreRecord param', async () => {
      const dataSource = new DataSource();
      dataSource.processRecord({}, [], null);
      expect(dataSource.status.individualRecordStatus[0].error).toEqual('processRecord - required coreRecord is null.');
    });
  });


  describe('getIntegrationUrl', () => {
    it('builds and returns a URL', () => {
      const dataSource = new DataSource();
      const url = dataSource.getIntegrationUrl('https://www.google.com', '/some/path/to/stuff', {
        param1: 1,
        param2: 'hello'
      });
      expect(url).toEqual(new URL('/some/path/to/stuff?param1=1&param2=hello', 'https://www.google.com'));
    });
  });

  describe('getAuthHeader', () => {
    const dataSource = new DataSource();
    dataSource.client_token = 'testToken';

    const expectedHeader = {
      headers: {
        Authorization: 'Bearer testToken'
      }
    };

    const header = dataSource.getAuthHeader();

    expect(header).toEqual(expectedHeader);
  });
});
