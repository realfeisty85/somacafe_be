import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as ffmpegStatic from 'ffmpeg-static';
import * as ffprobeStatic from 'ffprobe-static';
import * as fs from 'fs';
import * as tmp from 'tmp-promise';
import { PassThrough } from 'stream';

@Injectable()
export class PostApiV2Service {
  async createThumbnails(videoBuffer, setProgress) {
    const { path: videoPath, cleanup } = await tmp.file({ postfix: '.mp4' });
    console.log(videoPath);

    await fs.promises.writeFile(videoPath, videoBuffer);

    setProgress(20);

    const videoDuration = await this.getVideoDuration(videoPath);
    const times = [
      videoDuration * 0.1,
      videoDuration * 0.5,
      videoDuration * 0.9,
    ];

    const thumbnailBuffers = [];
    for (let i = 0; i < times.length; i++) {
      const outStream = new PassThrough();
      await this.generateThumbnail(videoPath, outStream, times[i]);
      const thumbnailBuffer = await this.readStream(outStream);
      thumbnailBuffers.push(thumbnailBuffer);
      setProgress(Math.round(((i + 1) / 3) * 100));
    }

    cleanup();

    return thumbnailBuffers;
  }

  async createOriginThumbnails(videoSrc, setProgress) {
    const { path: videoPath, cleanup } = await tmp.file({ postfix: '.mp4' });
    console.log(videoSrc);
    const localStoragePath = new URL(videoSrc).pathname;

    const videoBuffer = fs.readFileSync(`public/${localStoragePath}`);
    await fs.promises.writeFile(videoPath, videoBuffer);

    setProgress(20);

    const videoDuration = await this.getVideoDuration(videoPath);
    const times = [
      videoDuration * 0.1,
      videoDuration * 0.5,
      videoDuration * 0.9,
    ];

    const thumbnailBuffers = [];
    for (let i = 0; i < times.length; i++) {
      const outStream = new PassThrough();
      await this.generateThumbnail(videoPath, outStream, times[i]);
      const thumbnailBuffer = await this.readStream(outStream);
      thumbnailBuffers.push(thumbnailBuffer);
      setProgress(Math.round(((i + 1) / 3) * 100));
    }

    cleanup();

    return thumbnailBuffers;
  }

  getVideoDuration(videoPath) {
    return new Promise<number>((resolve, reject) => {
      ffmpeg(videoPath)
        .setFfprobePath(ffprobeStatic.path)
        .ffprobe(videoPath, (err, metadata) => {
          if (err) reject(err);
          else resolve(Number(metadata.format.duration));
        });
    });
  }

  async generateThumbnail(videoPath, outStream, time) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .setFfmpegPath(ffmpegStatic)
        .setFfprobePath(ffprobeStatic.path)
        .seekInput(time)
        // .size('1920x1080')
        .outputOptions(['-vframes 1', '-f image2pipe'])
        .output(outStream)
        .on('end', resolve)
        .on('error', (err) => {
          console.error(`Error generating thumbnail: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  readStream(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => {
        chunks.push(chunk);
      });
      stream.on('end', () => {
        const resultBuffer = Buffer.concat(chunks);
        const base64Image = `data:image/jpeg;base64,${resultBuffer.toString(
          'base64',
        )}`;
        resolve(base64Image);
      });
      stream.on('error', reject);
    });
  }
}
