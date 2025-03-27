import * as exec from '@actions/exec';
import * as core from '@actions/core';
import * as io from '@actions/io';
import * as path from "path";
import * as fs from "fs";

async function getHighestBuildToolsVersion(androidHome: string): Promise<string> {
    const buildToolsDir = path.join(androidHome, 'build-tools');
    if (!fs.existsSync(buildToolsDir)) {
        throw new Error(`Android build-tools directory not found @ ${buildToolsDir}`);
    }
    
    const versions = fs.readdirSync(buildToolsDir)
        .filter(dir => fs.statSync(path.join(buildToolsDir, dir)).isDirectory())
        .sort((a, b) => {
            const partsA = a.split('.').map(Number);
            const partsB = b.split('.').map(Number);
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const numA = partsA[i] || 0;
                const numB = partsB[i] || 0;
                if (numA !== numB) return numB - numA;
            }
            return 0;
        });
        
    if (versions.length === 0) {
        throw new Error(`No build-tools versions found in ${buildToolsDir}`);
    }
    
    core.debug(`Using highest build-tools version: ${versions[0]}`);
    return versions[0];
}

export async function signApkFile(
    apkFile: string,
    signingKeyFile: string,
    alias: string,
    keyStorePassword: string,
    keyPassword?: string
): Promise<string> {

    core.debug("Zipaligning APK file");

    // Find zipalign executable
    const buildToolsVersion = process.env.BUILD_TOOLS_VERSION || '';
    const androidHome = process.env.ANDROID_HOME;
    let buildTools = path.join(androidHome!, `build-tools/${buildToolsVersion}`);
    
    // If buildToolsVersion is empty or the specified version doesn't exist,
    // find the highest version in build-tools directory
    if (!buildToolsVersion || !fs.existsSync(buildTools)) {
        const version = await getHighestBuildToolsVersion(androidHome!);
        buildTools = path.join(androidHome!, `build-tools/${version}`);
    }

    const zipAlign = path.join(buildTools, 'zipalign');
    core.debug(`Found 'zipalign' @ ${zipAlign}`);

    // Align the apk file
    const alignedApkFile = apkFile;
    await exec.exec(`"${zipAlign}"`, [
        '-c',
        '-v', '4',
        apkFile
    ]);

    core.debug("Signing APK file");

    // find apksigner path
    const apkSigner = path.join(buildTools, 'apksigner');
    core.debug(`Found 'apksigner' @ ${apkSigner}`);

    // apksigner sign --ks my-release-key.jks --out my-app-release.apk my-app-unsigned-aligned.apk
    const signedApkFile = apkFile.replace('.apk', '-signed.apk');
    const args = [
        'sign',
        '--ks', signingKeyFile,
        '--ks-key-alias', alias,
        '--ks-pass', `pass:${keyStorePassword}`,
        '--out', signedApkFile
    ];

    if (keyPassword) {
        args.push('--key-pass', `pass:${keyPassword}`);
    }
    args.push(alignedApkFile);

    await exec.exec(`"${apkSigner}"`, args);
    await exec.exec(`"mv"`, [
        signedApkFile,
        apkFile
    ]);

    // Verify
    core.debug("Verifying Signed APK");
    await exec.exec(`"${apkSigner}"`, [
        'verify',
        apkFile
    ]);

    return apkFile
}

export async function signAabFile(
    aabFile: string,
    signingKeyFile: string,
    alias: string,
    keyStorePassword: string,
    keyPassword?: string,
): Promise<string> {
    core.debug("Signing AAB file");
    const jarSignerPath = await io.which('jarsigner', true);
    core.debug(`Found 'jarsigner' @ ${jarSignerPath}`);
    const args = [
        '-keystore', signingKeyFile,
        '-storepass', keyStorePassword,
    ];

    if (keyPassword) {
        args.push('-keypass', keyPassword);
    }

    args.push(aabFile, alias);

    await exec.exec(`"${jarSignerPath}"`, args);

    return aabFile
}
