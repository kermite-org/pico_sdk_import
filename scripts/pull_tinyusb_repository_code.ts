import * as path from "path";
import * as fs from "fs-extra";
import * as childProcess from "child_process";
import { glob } from "glob";

const puts = console.log;

function exec(command: string) {
  childProcess.spawnSync(command, { shell: true });
}

const srcSdkDir = ".tmp/tiny_usb";
const dstSdkDir = "./tinyusb";

function getSubFolderNamesInFolder(folderPath: string) {
  return fs
    .readdirSync(folderPath)
    .filter((it) => fs.lstatSync(path.join(folderPath, it)).isDirectory());
}

function getFileNamesInFolder(folderPath: string) {
  return fs
    .readdirSync(folderPath)
    .filter((it) => fs.lstatSync(path.join(folderPath, it)).isFile());
}

function extractSrcSubFoldersToDstFolder(relativeFolderPath: string) {
  const srcFolderPath = path.join(srcSdkDir, relativeFolderPath);
  const dstFolderPath = path.join(dstSdkDir, relativeFolderPath);
  fs.mkdirSync(dstFolderPath, { recursive: true });

  const subFolderNames = getSubFolderNamesInFolder(srcFolderPath);

  subFolderNames.forEach((subFolderName) => {
    fs.copySync(path.join(srcFolderPath, subFolderName), dstFolderPath);
  });
}

function flattenArray<T>(ar: T[][]): T[] {
  return ar.reduce((res, a) => [...res, ...a], []);
}

function uniqueArray<T>(ar: T[]): T[] {
  return ar.filter((a, idx) => ar.indexOf(a) === idx);
}
function countItemInArray<T>(ar: T[], value: T): number {
  return ar.filter((a) => a === value).length;
}

function filterConditionRemoveUnnecessarySources(fileName: string) {
  return !["CMakeLists.txt", "doc.h"].includes(fileName);
}

function extractSrcSubFoldersToDstFolderEx(relativeFolderPath: string) {
  const srcFolderPath = path.join(srcSdkDir, relativeFolderPath);
  const dstFolderPath = path.join(dstSdkDir, relativeFolderPath);
  fs.mkdirSync(dstFolderPath, { recursive: true });

  const moduleFolderNames = getSubFolderNamesInFolder(srcFolderPath);

  const allDestFileNames = flattenArray(
    moduleFolderNames.map((moduleFolderName) => {
      const moduleFolderPath = path.join(srcFolderPath, moduleFolderName);
      return getFileNamesInFolder(moduleFolderPath).filter(
        filterConditionRemoveUnnecessarySources
      );
    })
  );

  const overwrappingFileNames = uniqueArray(allDestFileNames).filter(
    (it) => countItemInArray(allDestFileNames, it) >= 2
  );
  // console.log({ dir: relativeFolderPath, overwrappingFileNames });

  moduleFolderNames.forEach((moduleFolderName) => {
    const moduleFolderPath = path.join(srcFolderPath, moduleFolderName);
    const fileNames = getFileNamesInFolder(moduleFolderPath).filter(
      filterConditionRemoveUnnecessarySources
    );
    fileNames.forEach((fileName) => {
      const srcPath = path.join(moduleFolderPath, fileName);
      const dstFileName = overwrappingFileNames.includes(fileName)
        ? `${
            path.basename(fileName).split(".")[0]
          }__${moduleFolderName}${path.extname(fileName)}`
        : fileName;
      const dstPath = path.join(dstFolderPath, dstFileName);
      fs.copySync(srcPath, dstPath);
    });

    const folderNames = getSubFolderNamesInFolder(moduleFolderPath);
    folderNames.forEach((folderName) => {
      const srcPath = path.join(moduleFolderPath, folderName);
      const dstPath = path.join(dstFolderPath, folderName);
      fs.copySync(srcPath, dstPath);
    });
  });
}

function copyFilesDirectUnder(relativeFolderPath) {
  const srcFolderPath = path.join(srcSdkDir, relativeFolderPath);
  const dstFolderPath = path.join(dstSdkDir, relativeFolderPath);
  fs.mkdirSync(dstFolderPath, { recursive: true });

  const fileNames = getFileNamesInFolder(srcFolderPath);

  fileNames.forEach((fileName) => {
    fs.copyFileSync(
      path.join(srcFolderPath, fileName),
      path.join(dstFolderPath, fileName)
    );
  });
}

function copyFolderRecursive(relativeFolderPath: string) {
  const srcFolderPath = path.join(srcSdkDir, relativeFolderPath);
  const dstFolderPath = path.join(dstSdkDir, relativeFolderPath);
  fs.copySync(srcFolderPath, dstFolderPath);
}

function removeFilesMatchTo(relativePatterns: string[]) {
  const patterns = relativePatterns.map((it) => path.join(dstSdkDir, it));
  patterns.forEach((pattern) => {
    const filePaths = glob.sync(pattern);
    filePaths.forEach((filePath) => fs.unlinkSync(filePath));
  });
}

function copySingleFile(relativeFilePath: string) {
  const srcFilePath = path.join(srcSdkDir, relativeFilePath);
  const dstFilePath = path.join(dstSdkDir, relativeFilePath);
  fs.copySync(srcFilePath, dstFilePath);
}

function outputFile(relativeFilePath: string, content: string) {
  const dstFilePath = path.join(dstSdkDir, relativeFilePath);
  fs.writeFileSync(dstFilePath, content, { encoding: "utf-8" });
}

function pullSdkSourceRepo() {
  puts("pull tinyusb repo ...");
  fs.rmdirSync(srcSdkDir, { recursive: true });
  exec(`git clone https://github.com/hathach/tinyusb ${srcSdkDir}`);
  // exec(`cd ${srcSdkDir} && git submodule update --init`);
  puts("pull tinyusb repo ... done");
}

const contentOfNoteText = [
  "import required code from tinyusb",
  "https://github.com/hathach/tinyusb",
].join("\n");

function run() {
  process.chdir("../");

  pullSdkSourceRepo();

  puts("copy files ...");
  fs.rmdirSync(dstSdkDir, { recursive: true });

  copyFilesDirectUnder("src");
  copyFolderRecursive("src/class/hid");
  copyFolderRecursive("src/common");
  copyFolderRecursive("src/device");
  copyFolderRecursive("src/osal");
  copyFolderRecursive("src/portable/raspberrypi");

  copySingleFile("LICENSE");

  puts("copy files ... done");

  outputFile("note.txt", contentOfNoteText);
  puts("done");
}

run();
