'use strict';

const {Datastore} = require('@google-cloud/datastore');

const ds = new Datastore();
const kind = 'Book';

function fromDatastore(obj) {
  obj.id = obj[Datastore.KEY].id;
  return obj;
}


function toDatastore(obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  let results = [];
  Object.keys(obj).forEach(k => {
    if (obj[k] === undefined) {
      return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1,
    });
  });
  return results;
}

// Lists all books in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, books, nextPageToken)``.
function list(limit, token, cb) {
  const q = ds
    .createQuery([kind])
    .order('rank')
    .limit(limit)
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}

// Similar to ``list``, but only lists the books created by the specified
// user.
function listBy(userId, limit, token, cb) {
  const q = ds
    .createQuery([kind])
    .filter('createdById', '=', userId)
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    cb(null, entities.map(fromDatastore), hasMore);
  });
}

// Creates a new book or updates an existing book with new data. The provided
// data is automatically translated into Datastore format. The book will be
// queued for background processing.
function update(id, data, cb) {
  let key;
  if (id) {
    key = ds.key([kind, parseInt(id, 10)]);
  } else {
    key = ds.key(kind);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['description']),
  };

  ds.save(entity, err => {
    data.id = entity.key.id;
    cb(err, err ? null : data);
  });
}

function read(id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.get(key, (err, entity) => {
    if (!err && !entity) {
      err = {
        code: 404,
        message: 'Not found',
      };
    }
    if (err) {
      cb(err);
      return;
    }
    cb(null, fromDatastore(entity));
  });
}

function _delete(id, cb) {
  const key = ds.key([kind, parseInt(id, 10)]);
  ds.delete(key, cb);
}

module.exports = {
  create: (data, cb) => {
    update(null, data, cb);
  },
  read: read,
  update: update,
  delete: _delete,
  list: list,
  listBy: listBy,
};
