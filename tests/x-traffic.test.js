import {test,expect} from 'bun:test';
import {timeline_posts} from '../examples/x/adapters/traffic.js';
const timeline = result => ({data:{home:{home_timeline_urt:{instructions:[{type:'TimelineAddEntries',entries:[{content:{itemContent:{__typename:'TimelineTweet',tweet_results:{result}}}},{content:{__typename:'TimelineTimelineCursor',value:'opaque'}}]}]}}}});
test('selected post remains separate from quote and bookmark state',()=>{
 const post={__typename:'Tweet',rest_id:'123',core:{user_results:{result:{__typename:'User',core:{screen_name:'fixture'}}}},legacy:{full_text:'Synthetic post',bookmarked:false},quoted_status_result:{result:{__typename:'Tweet',rest_id:'999'}}};
 expect(timeline_posts(timeline(post))).toEqual([{id:'123',author:'fixture',text:'Synthetic post',bookmarked:false,quoted_id:'999'}]);
});
test('unavailable variants and missing state do not fabricate posts or effects',()=>{
 expect(timeline_posts(timeline({__typename:'TweetUnavailable',rest_id:'123'}))).toEqual([]);
 expect(timeline_posts({errors:[{message:'fixture'}]})).toEqual([]);
 expect(timeline_posts(timeline({__typename:'Tweet',rest_id:'123'}))[0].bookmarked).toBeNull();
});
