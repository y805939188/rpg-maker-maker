import {spawn} from 'node:child_process';import {dirname} from 'node:path';
const child=spawn(process.argv[2],process.argv.slice(3),{env:{...process.env,PATH:dirname(process.execPath)+':'+process.env.PATH},stdio:'inherit'});child.on('error',e=>{console.error(e.message);process.exitCode=1});child.on('close',code=>process.exitCode=code??1);
