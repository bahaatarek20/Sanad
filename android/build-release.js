/**
 * Sanad Android Release Builder
 * Compiles and signs app-release.apk and app-release.aab
 */
const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidSdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Users\\bhaal\\Android';
const jdk = process.env.JAVA_HOME || 'C:\\Program Files\\Microsoft\\jdk-17.0.21.21-hotspot';

const aapt2 = path.join(androidSdk, 'build-tools', '34.0.0', 'aapt2.exe');
const d8 = path.join(androidSdk, 'build-tools', '34.0.0', 'd8.bat');
const zipalign = path.join(androidSdk, 'build-tools', '34.0.0', 'zipalign.exe');
const apksigner = path.join(androidSdk, 'build-tools', '34.0.0', 'apksigner.bat');
const androidJar = path.join(androidSdk, 'platforms', 'android-34', 'android.jar');
const bundletool = path.join(androidSdk, 'bundletool.jar');

const javac = path.join(jdk, 'bin', 'javac.exe');
const jar = path.join(jdk, 'bin', 'jar.exe');
const java = path.join(jdk, 'bin', 'java.exe');
const jarsigner = path.join(jdk, 'bin', 'jarsigner.exe');

const keystore = path.join(rootDir, 'release', 'sanad-release.keystore');
const releaseDir = path.join(rootDir, 'release');
const buildDir = path.join(rootDir, 'build_native');

if (!fs.existsSync(releaseDir)) fs.mkdirSync(releaseDir, { recursive: true });
if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(path.join(buildDir, 'gen'), { recursive: true });
fs.mkdirSync(path.join(buildDir, 'classes'), { recursive: true });
fs.mkdirSync(path.join(buildDir, 'dex'), { recursive: true });

const env = {
  ...process.env,
  JAVA_HOME: jdk,
  PATH: `${path.join(jdk, 'bin')};${process.env.PATH}`
};

console.log('=== [1/8] Compiling Resources ===');
const resZip = path.join(buildDir, 'res.zip');
cp.execFileSync(aapt2, ['compile', '--dir', path.join(rootDir, 'android/app/src/main/res'), '-o', resZip], { stdio: 'inherit' });

console.log('=== [2/8] Linking Resources & R.java ===');
const unalignedApk = path.join(buildDir, 'unaligned.apk');
cp.execFileSync(aapt2, [
  'link',
  '--version-code', '1',
  '--version-name', '1.0.0',
  '--min-sdk-version', '24',
  '--target-sdk-version', '34',
  '-I', androidJar,
  '--manifest', path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'),
  '-o', unalignedApk,
  resZip,
  '--java', path.join(buildDir, 'gen'),
  '--auto-add-overlay'
], { stdio: 'inherit' });

console.log('=== [3/8] Compiling Java Source Files ===');
const rJava = path.join(buildDir, 'gen', 'com', 'sanad', 'app', 'R.java');
const javaFiles = [
  rJava,
  path.join(rootDir, 'android/app/src/main/java/com/sanad/app/NetworkHelper.java'),
  path.join(rootDir, 'android/app/src/main/java/com/sanad/app/MainActivity.java')
];

cp.execFileSync(javac, [
  '-encoding', 'UTF-8',
  '-cp', androidJar,
  '-d', path.join(buildDir, 'classes'),
  ...javaFiles
], { stdio: 'inherit', env });

console.log('=== [4/8] Building DEX Bytecode ===');
function getAllFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) {
      results = results.concat(getAllFiles(full));
    } else if (file.endsWith('.class')) {
      results.push(full);
    }
  });
  return results;
}
const allClasses = getAllFiles(path.join(buildDir, 'classes'));
cp.execFileSync(d8, [
  '--output', path.join(buildDir, 'dex'),
  '--lib', androidJar,
  '--min-api', '24',
  ...allClasses
], { stdio: 'inherit', env, shell: true });

console.log('=== [5/8] Packaging & Aligning APK ===');
cp.execFileSync(jar, ['uf', unalignedApk, '-C', path.join(buildDir, 'dex'), 'classes.dex'], { stdio: 'inherit', env });

const alignedApk = path.join(buildDir, 'aligned.apk');
cp.execFileSync(zipalign, ['-p', '-f', '4', unalignedApk, alignedApk], { stdio: 'inherit' });

console.log('=== [6/8] Signing Release APK with Keystore ===');
const finalApk = path.join(releaseDir, 'app-release.apk');
cp.execFileSync(apksigner, [
  'sign',
  '--ks', keystore,
  '--ks-key-alias', 'sanad-key',
  '--ks-pass', 'pass:sanad123456',
  '--key-pass', 'pass:sanad123456',
  '--out', finalApk,
  alignedApk
], { stdio: 'inherit', env, shell: true });

console.log('=== [7/8] Building & Signing Google Play AAB Bundle ===');
const protoApk = path.join(buildDir, 'proto.apk');
cp.execFileSync(aapt2, [
  'link',
  '--proto-format',
  '--version-code', '1',
  '--version-name', '1.0.0',
  '--min-sdk-version', '24',
  '--target-sdk-version', '34',
  '-I', androidJar,
  '--manifest', path.join(rootDir, 'android/app/src/main/AndroidManifest.xml'),
  '-o', protoApk,
  resZip,
  '--auto-add-overlay'
], { stdio: 'inherit' });

const baseDir = path.join(buildDir, 'base');
fs.mkdirSync(baseDir, { recursive: true });
fs.mkdirSync(path.join(baseDir, 'manifest'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'dex'), { recursive: true });

const protoExtract = path.join(buildDir, 'proto_extract');
fs.mkdirSync(protoExtract, { recursive: true });
cp.execFileSync(jar, ['xf', protoApk], { cwd: protoExtract });

fs.copyFileSync(path.join(protoExtract, 'AndroidManifest.xml'), path.join(baseDir, 'manifest', 'AndroidManifest.xml'));
if (fs.existsSync(path.join(protoExtract, 'resources.pb'))) {
  fs.copyFileSync(path.join(protoExtract, 'resources.pb'), path.join(baseDir, 'resources.pb'));
}
if (fs.existsSync(path.join(protoExtract, 'res'))) {
  fs.cpSync(path.join(protoExtract, 'res'), path.join(baseDir, 'res'), { recursive: true });
}
fs.copyFileSync(path.join(buildDir, 'dex', 'classes.dex'), path.join(baseDir, 'dex', 'classes.dex'));

const baseZip = path.join(buildDir, 'base.zip');
cp.execFileSync(jar, ['cMf', baseZip, '-C', baseDir, '.'], { stdio: 'inherit' });

const finalAab = path.join(releaseDir, 'app-release.aab');
if (fs.existsSync(finalAab)) fs.unlinkSync(finalAab);

cp.execFileSync(java, [
  '-jar', bundletool,
  'build-bundle',
  `--modules=${baseZip}`,
  `--output=${finalAab}`
], { stdio: 'inherit' });

cp.execFileSync(jarsigner, [
  '-keystore', keystore,
  '-storepass', 'sanad123456',
  '-keypass', 'sanad123456',
  finalAab,
  'sanad-key'
], { stdio: 'inherit' });

// Also copy to public downloads and top-level release directory
const topReleaseDir = path.resolve(rootDir, '..', 'release');
if (fs.existsSync(topReleaseDir)) {
  fs.copyFileSync(finalApk, path.join(topReleaseDir, 'app-release.apk'));
  fs.copyFileSync(finalAab, path.join(topReleaseDir, 'app-release.aab'));
}

const pubDownloads = path.join(rootDir, 'public', 'downloads');
if (!fs.existsSync(pubDownloads)) fs.mkdirSync(pubDownloads, { recursive: true });
fs.copyFileSync(finalApk, path.join(pubDownloads, 'Sanad.apk'));

console.log('=== [8/8] Success! Artifacts generated in /release ===');
console.log('1. APK:', finalApk);
console.log('2. AAB:', finalAab);
console.log('3. Keystore:', keystore);
if (fs.existsSync(topReleaseDir)) {
  console.log('4. Top-level Release APK:', path.join(topReleaseDir, 'app-release.apk'));
}
