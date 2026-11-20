import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
// import * as fs from 'fs';

require('dotenv').config();
//test commit
async function bootstrap() {
  // const httpsOptions = {
  //   key: fs.readFileSync('cert/soma.cafe.key', 'utf8'),
  //   cert: fs.readFileSync('cert/STAR_soma_cafe.crt', 'utf8'),
  // };
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
    // httpsOptions,
  });

  app.use(bodyParser.json({ limit: '512mb' }));
  app.use(bodyParser.urlencoded({ limit: '512mb', extended: true }));
  app.use(bodyParser.text({ type: ['text/html'] }));

  app.use(compression());
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');
  app.enableCors();

  // Enable Helmet and override X-Frame-Options to DENY
  app.use(
    helmet({
      contentSecurityPolicy: false,
    }),
  );
  app.use(helmet.frameguard({ action: 'deny' }));
  app.use(
    helmet.hsts({
      maxAge: 0,
    }),
  );

  app.use((req, res, next) => {
    if (req.headers['origin'] === 'http://localhost:3000') {
      res.header('Access-Control-Allow-Origin', req.headers['origin']);
    } else {
      res.header('Access-Control-Allow-Origin', 'https://soma.cafe');
    }
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept',
    );
    next();
  });

  const config = new DocumentBuilder()
    .setTitle('Soma API')
    .setDescription('Some API Doc')
    .setVersion('1,0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.APP_PORT || 3000);
}

bootstrap();
