import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Buffer } from 'buffer';

require('dotenv').config();

@Injectable()
export class SecurityService {
  private readonly encryptionKey;
  constructor() {
    this.encryptionKey = process.env.CIPHER_KEY;
  }
  comparePassword(text: string, encryptedText: string): boolean {
    try {
      const encText = Buffer.from(encryptedText, 'base64');
      const iv = encText.slice(0, 16);

      const loginPassword = this.encryptText(text, iv);
      return loginPassword === encryptedText;
    } catch (e) {
      console.log('Error checking password');
      console.log(e);
    }
    return false;
  }

  encryptText(text: string, iv?: Buffer) {
    const tokenBuff = Buffer.from(text, 'base64');
    if (!iv) {
      iv = crypto.randomBytes(16);
    }
    // const hmac = tokenBuff.slice(16, 16 + 32);
    const cipher = crypto.createCipheriv('aes-128-cbc', this.encryptionKey, iv);

    let result = cipher.update(text, 'utf8', 'utf8');
    result += cipher.final();

    const fin = Buffer.concat([iv, Buffer.from(result)]).toString('base64');
    return fin;
  }
}
