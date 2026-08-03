import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';

const workflow=await readFile('.github/workflows/build-android-apk.yml','utf8');
test('Android workflow has manual and main Android-change triggers',()=>{assert.match(workflow,/workflow_dispatch:/);assert.match(workflow,/branches: \[main\]/);assert.match(workflow,/android\/\*\*/);assert.match(workflow,/public\/\*\*/)});
test('Android workflow installs, builds, validates, restores Gradle, and builds APK',()=>{for(const command of ['npm ci --ignore-scripts','npm run build','npx cap sync android','gradle -p android help --no-daemon --stacktrace','wrapper --gradle-version 8.11.1','cp "$wrapper_project/gradle/wrapper/gradle-wrapper.jar"','./android/gradlew assembleDebug'])assert.ok(workflow.includes(command),`missing ${command}`)});
test('Android workflow uploads only renamed APK with retention',()=>{assert.match(workflow,/FootballVows-debug-apk/);assert.match(workflow,/artifacts\/FootballVows-debug\.apk/);assert.match(workflow,/retention-days: 14/);assert.doesNotMatch(workflow,/(API_FOOTBALL_KEY|SUPABASE_SERVICE_ROLE_KEY|GOOGLE_CLIENT_SECRET|storePassword|keyPassword)/)});
