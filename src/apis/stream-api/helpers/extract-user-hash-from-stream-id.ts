export const extractUserHashFromStreamId = (streamId: string) => {
  return streamId.split('_')[0];
};
