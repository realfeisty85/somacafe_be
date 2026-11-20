export const formVideoPostContent = (videoPath: string) => {
  return `<video src='${videoPath}' class='w-full h-full rounded-xl' controls></video>`;
};
