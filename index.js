'use strict';

const db = require('ep_etherpad-lite/node/db/DB').db;
db.dbSettings.cache = 0; // remove cache

const api = require ('ep_etherpad-lite/node/db/API');
const apiHandler = require('ep_etherpad-lite/node/handler/APIHandler');
const CustomError = require('ep_etherpad-lite/node/utils/customError');

exports.expressCreateServer = (hookName, args, cb) => {
  //extend http api
  apiHandler.version['1'].getTextAtTime = ['padID', 'millis'];
  api['getTextAtTime'] = exports.getTextAtTime;
  cb();
}

/**
getTextAtTime(padID, millis) returns the text of pad (padID) at given time index (millis)

possible returns:

{code: 0, message:"ok", data: {"text":{"text":"some old text","attribs":"..."}}
{code: 1, message:`no entries for pad 'padID'`,           data: null}
{code: 1, message:`millis is undefined`,                  data: null}
{code: 1, message:`millis (abc) is not a number`,         data: null}
{code: 1, message:`millis (-123) is a negative number`,   data: null}
{code: 1, message:`millis (123.456) is not an int value`, data: null}
{code: 1, message:`time (123) preceeds first revision`,   data: null}
{code: 1, message:`internal error`,                       data: null}

*/

exports.getTextAtTime = async (padID, millis) => {

  // checks if timestamp is a legal number
  function checkValidTimestamp (timestamp) {

    let t = timestamp;
    if (t == undefined) {
      throw new CustomError(`millis is undefined`, `apierror`);
    }

    if (typeof t !== 'number') {
      t = parseInt(t, 10);
    }

    // check if rev is a number
    if (isNaN(t)) {
      throw new CustomError(`millis (${timestamp}) is not a number`, `apierror`);
    }

    // ensure this is not a negative number
    if (t < 0) {
      throw new CustomError(`millis (${timestamp}) is a negative number`, `apierror`);
    }

    // ensure this is not a float value
    if (!Number.isInteger(t)) {
      throw new CustomError(`millis (${timestamp}) is not an int value`, `apierror`);
    }
    return t;

  }

  // traverse revisions descending starting at index until revision timestamp is smaller then millis 
  function checkRevisions(revs, index, resolve) {
    if (index < 0) {
      // no revisions left, give back negative index as indicator
      resolve(index);
    }
    else {
      // db get revision
      db.get(revs[index], (err, val) => {
        
        if (!err && val && val.meta && val.meta.timestamp) {
          
          let revTimestamp;
          try {
            // parse rivision timestamp
            revTimestamp = checkValidTimestamp(val.meta.timestamp, 10);
            if (revTimestamp <= millis) {
              resolve(index);
            } else {
              // recursion: check previouse revision
              return checkRevisions(revs, index - 1, resolve);
            }
          
          } catch (e) {
            // db entry malformed
            resolve(null);
          }
          
        } else {
          // db error
          resolve(null);
        }
      });
    }
  }

  // try to parse the millis
  millis = checkValidTimestamp(millis);
  // get all revisions of pad ${padID}
  const revs = await new Promise((resolve) => {
    db.findKeys(`pad:${padID}:revs:*`, null, (err, val) => {
      resolve(val);
    });
  });
  
  if (revs == null || revs.length < 1) {
      throw new CustomError(`no entries for pad '${padID}'`, `apierror`);
  }
  
  const rev = await new Promise((resolve) => {
    checkRevisions(revs, revs.length -1, resolve);
  });

  if (rev == null) {
    throw new CustomError(`internal error`, `apierror`);
  }

  else if (rev <= -1) {
    throw new CustomError(`time (${millis}) preceeds first revision`, `apierror`);
  }

  
  return api.getText(padID, rev);

}

