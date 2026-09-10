// X HomeTimeline response observed through TAP Core, 2026-09-09.
// This is a pure projection of supplied data, never a network client.
export function timeline_posts(response) {
  const instructions = response?.data?.home?.home_timeline_urt?.instructions;
  if (!Array.isArray(instructions)) return [];
  const posts = [];
  for (const instruction of instructions) {
    if (instruction.type !== 'TimelineAddEntries' || !Array.isArray(instruction.entries)) continue;
    for (const entry of instruction.entries) {
      const item = entry?.content?.itemContent;
      if (item?.__typename !== 'TimelineTweet') continue;
      const tweet = item.tweet_results?.result;
      if (tweet?.__typename !== 'Tweet' || typeof tweet.rest_id !== 'string' || !/^\d+$/.test(tweet.rest_id)) continue;
      const user = tweet.core?.user_results?.result;
      const quote = tweet.quoted_status_result?.result;
      posts.push({
        id:tweet.rest_id,
        author:user?.__typename === 'User' && typeof user.core?.screen_name === 'string' ? user.core.screen_name : null,
        text:typeof tweet.legacy?.full_text === 'string' ? tweet.legacy.full_text : null,
        bookmarked:typeof tweet.legacy?.bookmarked === 'boolean' ? tweet.legacy.bookmarked : null,
        quoted_id:quote?.__typename === 'Tweet' && typeof quote.rest_id === 'string' ? quote.rest_id : null,
      });
    }
  }
  return posts;
}
