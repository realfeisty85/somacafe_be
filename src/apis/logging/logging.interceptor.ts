import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

require('dotenv').config();

export class LoggingInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    const [req] = context.getArgs();

    // console.log('-- interceptor -- [');
    // console.log(req.route.path);
    // console.log(req.route.methods);
    // console.log(req.headers);
    // console.log(req['body']);
    // console.log(req['query']);
    // console.log('-- interceptor --]');

    if (req.headers['authorization']) {
      const auth = Buffer.from(
        req.headers['authorization'].split(' ')[1],
        'base64',
      );

      const login = process.env['API_AUTH_LOGIN'];
      const pwd = process.env['API_AUTH_PASSWORD'];

      if (`${login}:${pwd}` === auth.toString('utf8')) {
        return next.handle();
      } else {
        const splitAuth = String(
          req.headers['authorization'].split(' ')[1],
        ).split('.');
        if (Array.isArray(splitAuth)) {
          const { typ } = JSON.parse(
            String(Buffer.from(splitAuth[0], 'base64')),
          );
          if (typ && typ === 'JWT') {
            return next.handle();
          }
        }
      }
    }

    process.exit(1);
  }
}
