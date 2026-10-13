import {defineConfig} from '@playwright/test';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),dev=process.env.E2E_MODE==='dev',kind=dev?'dev':'production';
export default defineConfig({testDir:resolve(root,'e2e'),workers:1,retries:0,outputDir:resolve(root,'.local/step06-review/private/browser-'+kind),use:{baseURL:`http://127.0.0.1:${dev?5271:4371}`,browserName:'chromium',viewport:{width:1200,height:900},trace:'retain-on-failure'},webServer:{command:dev?'pnpm dev':'pnpm start',cwd:root,env:{PATH:dirname(process.execPath)+':'+process.env.PATH},url:'http://127.0.0.1:4371/api/health',reuseExistingServer:false,timeout:30000},reporter:[['list'],['json',{outputFile:resolve(root,'.local/step06-review/evidence/browser-'+kind+'.json')}]]});
