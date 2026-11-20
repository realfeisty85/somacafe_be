import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import handlebars from 'handlebars';

@Injectable()
export class MailService {
  async sendMail(
    mailTo: string,
    subject: string,
    mailText: string,
    mailHtml: string,
  ) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: false, // true for 465, false for other ports
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      tls: {
        rejectUnauthorized: false,
      },
    });

    //send mail with defined transport object

    const res = await transporter.sendMail({
      from: '"no-reply" <no-reply@soma.cafe>', // sender address
      to: mailTo, // list of receivers
      subject: subject, // Subject line
      text: mailText, // plain text body
      html: mailHtml, // html body
    });

    console.log('Mail Sent');
    console.log(res);
  }

  async renderTemplate(
    templatePath: string,
    tempalteVars: any,
  ): Promise<string> {
    try {
      const template = await fs.readFileSync(
        `views/${templatePath}.hbs`,
        'utf-8',
      );
      const compiledTemplate = handlebars.compile(template);
      const resCompiled = compiledTemplate(tempalteVars);
      return Promise.resolve(resCompiled);
    } catch (e) {
      console.log('Error while compiling a template for email');
      console.log(e);
    }
  }
}
