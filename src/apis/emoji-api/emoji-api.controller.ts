import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import * as fs from 'fs';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Controller('emoji-api')
export class EmojiApiController {
  constructor(private http: HttpService) {}

  @Get()
  async getEmojis(@Req() req, @Res() res, @Query() query) {
    const http = this.http;

    fs.stat('emojis.json', async function (err, stat) {
      if (err === null) {
        console.log('file exists');
      } else {
        console.log('need to fetch file');
        try {
          const emojis = await http.get(
            'https://cdn.jsdelivr.net/npm/@emoji-mart/data/sets/14/twitter.json',
          );
          const data: any = await lastValueFrom(emojis);
          fs.writeFileSync('emojis.json', JSON.stringify(data.data));
        } catch (e) {
          console.log(e);
          console.log('Unable to fetch MEojis');
        }
      }
    });

    const statRes = fs.statSync('emojis.json');
    if (statRes && statRes?.size > 0) {
      const content = fs.readFileSync('emojis.json');
      const data = Buffer.from(content).toString('utf8');

      const js = JSON.parse(data);
      const customEmo = [
        {
          id: 'parrot',
          name: 'Parrot',
          keywords: ['parrot'],
          skins: [{ src: '/public/parrot.gif' }],
        },
      ];

      js['custom'] = customEmo;
      console.log(js);
      res.json(js);
      return;
    }

    res.status(200).send();
  }
}
