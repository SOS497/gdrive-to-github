const triggerName = "watchGoogleFolders";
const configurationSheet = "1teprfc0uj2DFP-k4YOStZCN6vUnaIjukMhGeD4licGA";

const enable = () => {
  const [trigger = null] = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === triggerName);
  if (trigger === null) {
    ScriptApp.newTrigger(triggerName).timeBased().everyMinutes(15).create();
  }
};

const disable = () => {
  const [trigger = null] = ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === triggerName);
  if (trigger !== null) {
    ScriptApp.deleteTrigger(trigger);
  }
};

const _toHexSig = (byteSignature) => {
  // convert byte array to hex string
  return byteSignature.reduce(function(str,chr){
    chr = (chr < 0 ? chr + 256 : chr).toString(16);
    return str + (chr.length==1?'0':'') + chr;
  },'');
};

const _fireWebhook = (inputFolder, outputFolder, url, ) => {
  Logger.log(`Firing webhook for: ${folder.getName()}`);
  return false;
};

const watchGoogleFolders = () => {
  const propertyStore = PropertiesService.getScriptProperties();

  const transforms = Sheets.Spreadsheets.Values.get(configurationSheet, "Folder Transformations!A2:C").values;
  if (!transforms) {
    Logger.log("No transformations. Nothing to do!");
  }

  for (const row in transforms){
    try{
      const inputId = transforms[row][0];
      const transformUrl = transforms[row][1];
      const outputId = transforms[row][2];

      Logger.log(`Processing: input = '${inputId}', transform = '${transformUrl}', output = '${outputId}'`);

      if (!inputId || !transformUrl || !outputId){
        Logger.log(`Cannot process: input = '${inputId}', transform = '${transformUrl}', output = '${outputId}'`);
        continue;
      }

      const inputFolder = DriveApp.getFolderById(inputId);
      const outputFolder = DriveApp.getFolderById(outputId);

      if (!inputFolder || !outputFolder){
        Logger.log(`Cannot find a folder for one of: input = '${inputId}', output = '${outputId}'`);
        continue;
      }

      let fileSet = {};
      let files = inputFolder.getFiles();
      while( files.hasNext() ){
        let file = files.next();
        fileSet[file.getName()] = file.getLastUpdated();
      }

      let digest = _toHexSig(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, JSON.stringify(fileSet)));

      let folderKey = "folder." + inputId;
      let existingDigest = propertyStore.getProperty(folderKey) || "NOT_SCANNED";
      if (digest !== existingDigest){
        Logger.log(`Folder '${inputFolder.getName()}' changed! (old: '${existingDigest}', new: '${digest}')`);
        if (_fireWebhook(inputId, outputId, transform)){
          propertyStore.setProperty(folderKey, digest);
        }
      }
    }
    catch(error){
      Logger.log(error);
    }
  }
};
