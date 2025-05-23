# Sign Android Release Action

This action will help you sign an Android `.apk` or `.aab` (Android App Bundle) file for release.

## Inputs

### `releaseDirectory`

**Required:** The relative directory path in your project where your Android release file will be located

### `signingKeyBase64`

**Required:** The base64 encoded signing key used to sign your app

This action will directly decode this input to a file to sign your release with. You can prepare your key by running this command on *nix systems.

```bash
openssl base64 < some_signing_key.jks | tr -d '\n' | tee some_signing_key.jks.base64.txt
```
Then copy the contents of the `.txt` file to your GH secrets

### `alias`

**Required:** The alias of your signing key 

### `keyStorePassword`

**Required:** The password to your signing keystore

### `keyPassword`

**Optional:** The private key password for your signing keystore

## ENV: `BUILD_TOOLS_VERSION`

**Optional:** You can manually specify a version of build-tools to use. If not specified, the system will automatically use the highest available version.

## Outputs

输出和输入是相同的文件，并且没有中间临时文件，  
也就是说不论是否执行这个签名，最终存在的都还是一样的那个文件，

### `signedReleaseFile`

The path to the signed release file from this action

### ENV: `SIGNED_RELEASE_FILE`

This also set's an environment variable that points to the signed release file

## Example usage

```yaml
steps:
  # ...

  - uses: AoEiuV020/sign-android-release@v1
    name: Sign app APK
    # ID used to access action output
    id: sign_app
    with:
      releaseDirectory: app/build/outputs/apk/release
      signingKeyBase64: ${{ secrets.SIGNING_KEY }}
      alias: ${{ secrets.ALIAS }}
      keyStorePassword: ${{ secrets.KEY_STORE_PASSWORD }}
      keyPassword: ${{ secrets.KEY_PASSWORD }}
    env:
      // specify build-tools version -- optional
      BUILD_TOOLS_VERSION: "30.0.2"
      
  # Example use of `signedReleaseFile` output -- not needed
  - uses: actions/upload-artifact@v2
    with:
      name: Signed app bundle
      path: ${{steps.sign_app.outputs.signedReleaseFile}}
```
