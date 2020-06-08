'use strict';

let dbm;
let type;
let seed;

const ObjectId = require('mongodb').ObjectID;

/**
 * We receive the dbmigrate dependency from dbmigrate initially.
 * This enables us to not have to rely on NODE_PATH.
 */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

/**
 * Updates a single incorrect NRPTI record, whose _epicProjectId was incorrectly set to the object id for the LNG Canada
 * project. Update the records _epicProjectId to the object id of the Coastal Gaslink project.
 *
 * @param {*} db
 */
exports.up = async function(db) {
  const mongoClient = await db.connection.connect(db.connectionString, { native_parser: true });

  try {
    const nrptiCollection = await mongoClient.collection('nrpti');

    await nrptiCollection.findOneAndUpdate(
      {
        _id: new ObjectId('5ed7cd046b6f9d0021f6f357'),
        _epicProjectId: new ObjectId('588510cdaaecd9001b815f84'), // incorrect id, represents LNG Canada
        projectName: 'Coastal Gaslink'
      },
      { $set: { _epicProjectId: new ObjectId('588511c4aaecd9001b825604') } } // correct id, represents Coastal Gaslink
    );

    mongoClient.close();
  } catch (e) {
    console.log('Error:', e);
    mongoClient.close();
  }
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  version: 1
};
