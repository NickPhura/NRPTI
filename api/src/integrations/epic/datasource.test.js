const DataSource = require('./datasource');

describe('DataSource', () => {
  describe('constructor', () => {
    it('sets params', () => {
      const dataSource = new DataSource(null, null, { params: 1 });
      expect(dataSource.params).toEqual({ params: 1 });
    });

    it('sets default params if not provided', () => {
      const dataSource = new DataSource();
      expect(dataSource.params).toEqual({});
    });

    it('sets auth_payload', () => {
      const dataSource = new DataSource(null, { auth_payload: 'some payload' }, { params: 1 });
      expect(dataSource.auth_payload).toEqual({ auth_payload: 'some payload' });
    });

    it('sets default status fields', () => {
      const dataSource = new DataSource();
      expect(dataSource.status).toEqual({
        itemsProcessed: 0,
        itemTotal: 0,
        typeStatus: [],
        individualRecordStatus: []
      });
    });
  });

  describe('updateRecords', () => {
    it('catches any thrown exceptions and returns gracefully', async () => {
      // mock function to throw an error
      const mockUpdateRecordType = jest.fn(() => {
        throw Error('unexpected error!');
      });

      const dataSource = new DataSource();

      dataSource.updateRecordType = mockUpdateRecordType;

      const status = await dataSource.updateRecords();

      expect(status).toEqual({
        message: 'updateRecords - unexpected error',
        error: 'unexpected error!',
        itemsProcessed: 0,
        itemTotal: 0,
        typeStatus: [],
        individualRecordStatus: []
      });
    });
  });

  describe('updateRecordType', () => {
    it('catches any thrown exceptions and returns gracefully', async () => {
      const dataSource = new DataSource();

      // calling updateRecordType with null parameter will cause an exception
      const recordTypeStatus = await dataSource.updateRecordType();

      expect(recordTypeStatus).toEqual({
        message: 'updateRecordType - unexpected error',
        error: 'updateRecordType - required recordType is null.',
        type: undefined,
        itemTotal: 0,
        url: ''
      });
    });

    it('returns early if no epic records are found', async () => {
      // mock utils called by updateRecordType()
      jest.spyOn(require('../integration-utils'), 'getRecords').mockImplementation(() => {
        return Promise.resolve([{ searchResults: [], meta: 'meta!' }]);
      });

      const dataSource = new DataSource();

      // mock DataSource functions called by updateRecordType()
      dataSource.getIntegrationUrl = jest.fn(() => {
        return { href: '' };
      });
      dataSource.processRecord = jest.fn();

      const recordType = { type: { typeId: '123' }, milestone: { milestoneId: '123' }, getUtil: jest.fn() };

      const recordTypeStatus = await dataSource.updateRecordType(recordType);

      expect(recordType.getUtil).not.toHaveBeenCalled();
      expect(dataSource.processRecord).not.toHaveBeenCalled();

      expect(recordTypeStatus).toEqual({
        message: 'updateRecordType - no records found',
        type: recordType,
        itemTotal: 0,
        url: ''
      });
    });

    it('calls all functions necessary to update epic records for the given type', async () => {
      // mock utils called by updateRecordType()
      const mockResponse = [
        {
          searchResults: [
            { _id: '123', _schemaName: 'test'}, 
            { _id: '456', _schemaName: 'test'}, 
            { _id: '789', _schemaName: 'test'}
          ],
          meta: 'meta!'
        }
      ];
      jest.spyOn(require('../integration-utils'), 'getRecords').mockImplementation(() => {
        return Promise.resolve(mockResponse);
      });
      
      const dataSource = new DataSource({ updateTaskRecord: jest.fn() }, null, { param1: 1 });

      // mock DataSource functions called by updateRecordType()
      dataSource.getIntegrationUrl = jest.fn(() => {
        return { href: 'url' };
      });
      dataSource.processRecord = jest.fn(() => {});

      const mockUtil = jest.fn().mockImplementation(() => {
        return {
          transformRecord: jest.fn(record => Promise.resolve(record)),
          isRecordFeeOrder: jest.fn(() => false)
        };
      });

      const recordType = {
        type: { typeId: '111' },
        milestone: { milestoneId: '222' },
        getUtil: mockUtil
      };

      const status = await dataSource.updateRecordType(recordType);

      expect(dataSource.getIntegrationUrl).toHaveBeenCalledWith(
        'eagle-prod.pathfinder.gov.bc.ca',
        '/api/public/search',
        {
          and: { milestone: '222', param1: 1, type: '111' },
          dataset: 'Document',
          pageNum: 0,
          pageSize: Number.MAX_SAFE_INTEGER,
          populate: false
        }
      );

      expect(recordType.getUtil).toHaveBeenCalledTimes(1);

      expect(dataSource.processRecord).toHaveBeenNthCalledWith(1, expect.anything(), { _id: '123', _schemaName: 'test' });
      expect(dataSource.processRecord).toHaveBeenNthCalledWith(2, expect.anything(), { _id: '456', _schemaName: 'test' });
      expect(dataSource.processRecord).toHaveBeenNthCalledWith(3, expect.anything(), { _id: '789', _schemaName: 'test' });

      expect(status).toEqual({
        type: recordType,
        itemTotal: 3,
        url: 'url',
        epicMeta: 'meta!'
      });
    });
  });

  describe('processRecord', () => {
    it('throws an error if recordTypeUtils is null', async () => {
      const dataSource = new DataSource();

      await dataSource.processRecord(null, { _id: '333' });

      expect(dataSource.status.individualRecordStatus[0]).toEqual({
        epicId: '333',
        message: 'processRecord - unexpected error',
        error: 'processRecord - required recordTypeUtils is null.'
      });
    });

    it('throws an error if epicRecords is null', async () => {
      const dataSource = new DataSource();

      await expect(dataSource.processRecord({}, null));

      expect(dataSource.status.individualRecordStatus[0]).toEqual({
        epicId: null,
        message: 'processRecord - unexpected error',
        error: 'processRecord - required epicRecord is null.'
      });
    });

    it('transforms, saves, and updates the status for each epic record', async () => {
      const dataSource = new DataSource();

      dataSource.getRecordProject = jest.fn(record => {
        return { name: record._id };
      });

      // mock record type utils
      const recordTypeUtils = {
        transformRecord: jest.fn(record => {
          return { ...record, transformed: true };
        }),
        findExistingRecord: jest.fn(() => null),
        createDocument: jest.fn(() => []),
        createRecord: jest.fn(record => {
          return [{ status: 'success' }];
        })
      };

      const epicRecord = { _id: '123' };

      await dataSource.processRecord(recordTypeUtils, epicRecord);

      expect(dataSource.getRecordProject).toHaveBeenCalledWith({ _id: '123' });

      expect(recordTypeUtils.transformRecord).toHaveBeenCalledWith({
        _id: '123',
        project: { name: '123' }
      });

      expect(recordTypeUtils.findExistingRecord).toHaveBeenCalledWith({
        _id: '123',
        documents: [],
        project: { name: '123' },
        transformed: true
      });

      expect(recordTypeUtils.createDocument).toHaveBeenCalledWith({
        _id: '123',
        project: { name: '123' }
      });

      expect(recordTypeUtils.createRecord).toHaveBeenCalledWith({
        _id: '123',
        documents: [],
        project: { name: '123' },
        transformed: true
      });

      expect(dataSource.status.itemsProcessed).toEqual(1);
    });
  });

  describe('getIntegrationUrl', () => {
    it('builds and returns an https url', () => {
      const dataSource = new DataSource();
      const url = dataSource.getIntegrationUrl('www.google.com', '/some/path/to/stuff', {
        param1: 1,
        param2: 'hello'
      });
      expect(url).toEqual(new URL('/some/path/to/stuff?param1=1&param2=hello', 'https://www.google.com'));
    });
  });
});
