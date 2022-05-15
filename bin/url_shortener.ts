#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {UrlShortenerStack} from '../lib/url_shortener-stack';

const app = new cdk.App();

// eslint-disable-next-line no-new
new UrlShortenerStack(app, 'UrlShortenerStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION
    },
});
