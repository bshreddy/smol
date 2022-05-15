import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, Attribute, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs'
import * as path from 'path';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnParameter } from 'aws-cdk-lib';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';

export class UrlShortenerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const subdomain = new CfnParameter(this, "subdomain", {
      type: 'String',
      description: 'Subdomain that will be used to access the shortener',
    });

    const hostedZoneId = new CfnParameter(this, "hostedZoneId", {
      type: 'String',
      description: 'Hosted zone ID that will be used to create the DNS record',
    });

    const dynamoTable_partitionKey: Attribute = {
      name: 'hash',
      type: AttributeType.STRING
    };

    const dynamoTable = new Table(this, 'url_hashes', {
      partitionKey: dynamoTable_partitionKey,
      tableName: 'url_hashes'
    });

    const nodejsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: [
          'aws-sdk'
        ],
      },
      depsLockFilePath: path.join(__dirname, '..', 'lambdas', 'package-lock.json'),
      environment: {
        PRIMARY_KEY: dynamoTable_partitionKey.name,
        TABLE_NAME: dynamoTable.tableName,
      },
      runtime: Runtime.NODEJS_16_X
    };

    const registerLambda = new NodejsFunction(this, 'register', {
      entry: path.join(__dirname, '..', 'lambdas', 'register.ts'),
      ...nodejsFunctionProps
    });

    const redirectLambda = new NodejsFunction(this, 'redirect', {
      entry: path.join(__dirname, '..', 'lambdas', 'redirect.ts'),
      ...nodejsFunctionProps
    });

    dynamoTable.grantReadWriteData(registerLambda);
    dynamoTable.grantReadData(redirectLambda);

    const api = new RestApi(this, 'url_shortener_api', {
      restApiName: 'URL Shortener Service',
    });
    api.root.addMethod('POST', new LambdaIntegration(registerLambda));
    api.root.addMethod('GET', new LambdaIntegration(redirectLambda));

    const hostedZone = HostedZone.fromHostedZoneId(this, 'hostedZone', hostedZoneId.valueAsString);

    const domainRecord = new ARecord(this, 'domainRecord', {
      recordName: `${subdomain.valueAsString}.${hostedZone.zoneName}`,
      zone: hostedZone,
      target: RecordTarget.fromAlias(new ApiGateway(api)),
    });
  }
}
