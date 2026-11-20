export const formStreamPostContent = (fullPath: string) => {
  const content = `<iframe width="100%" class="stream-post rounded-xl" src="${fullPath}" allowFullScreen ></iframe>`;

  return content;
};
