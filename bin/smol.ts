#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SmolStack } from '../lib/smol-stack';

const app = new cdk.App();

// eslint-disable-next-line no-new
new SmolStack(app, 'smol-stack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});
