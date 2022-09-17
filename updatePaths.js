import * as dotenv from 'dotenv' 
dotenv.config();
import fetch from 'node-fetch';

const storyblokToken = process.env.STORYBLOK_TOKEN;
const spaceId = process.env.SPACE_ID;
const storyblokOAuthToken = process.env.STORYBLOK_OAUTH_TOKEN;
const postsURL = `https://api.storyblok.com/v2/cdn/stories/?`;

let categories;

const getAndUpdate = async () => {

  const per_page = 50
  const initial = await fetch(postsURL + new URLSearchParams({ 
    starts_with: 'blog/posts/',
    per_page: 1, 
    page: 1, 
    version: 'published',
    token: storyblokToken 
  })) 
  const totalPages = Math.ceil(initial.headers.get('total') / per_page);
  console.log('Total pages:', totalPages);
  const stories = await getStories(1, totalPages, per_page);
  console.log('Total stories:', stories.length);
  
  // Get categories, no pagination needed
  const catResponse = await fetch(postsURL + new URLSearchParams({
    token: storyblokToken,
    starts_with: 'blog/categories/',
  })) 
  if (!catResponse.ok) {
    const message = `A FETCH error has occured: ${response.status}`;
    throw new Error(message);
  }
  const catJSON = await catResponse.json()
  categories = catJSON.stories;
  
  // setup counts object for clean final log
  let finalCounts = {};

  // loop through all stories to update their paths
  const resultArray = await Promise.all(
    stories.map(async (story, index) => asyncStoryFunction(story, index))
  )
  // turn results (an array of 'success' or error messages) into an object of their counts
  resultArray.forEach(function (x) { finalCounts[x] = (finalCounts[x] || 0) + 1; });
  console.log(finalCounts);
    
}

const getStories = async (page = 1, totalPages, per_page) => {
  const params = {
    starts_with: 'blog/posts/',
    page: page,
    per_page: per_page,
    token: storyblokToken,
    resolve_relations: 'post.categories',
    excluding_fields: 'content.content',
    version: 'published'
  }
  const storyResponse = await fetch(postsURL + new URLSearchParams(params)) 
  if (!storyResponse.ok) {
    const message = `A FETCH error has occured: ${response.status}`;
    throw new Error(message);
  }
  const storyJSON = await storyResponse.json()
  const storyArray = storyJSON.stories;

  if (totalPages > page) {
    return storyArray.concat(await getStories(page+1, totalPages, per_page)) 
  } else {
    return storyArray
  }
}


const asyncStoryFunction = async (story, index) => {
  // Get category object from related objects (rels[])
  const category = categories.find(cat => cat.uuid == story.content.categories[0]);
  // Prepare path using category slug followed by story slug
  const realPath = `blog/${category.slug}/${story.slug}`
  // Delay otherwise we hit the API limit if this is a bulk update
  await delay(500 * index)
  const result = await updateStory(story, realPath);
  return result;
}

const updateStory = async (story, path) => {
  // Setup object with 2 required properties and the new path
  const storyUpdateObj = {
    name: story.name,
    slug: story.slug,
    path: path
  }
  const storyObj = { story: storyUpdateObj, publish: 1 }
  return await fetch(`https://mapi.storyblok.com/v1/spaces/${spaceId}/stories/${story.id}`, {
    method: 'PUT',
    body: JSON.stringify(storyObj),
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': storyblokOAuthToken
    }
  }).then(res => res.json())
  .then(json => { 
    console.log(`Story ${story.id} updated`);
    return 'success';
  })
  .catch(e => {
    console.error("PUT => ", e.message);
    return e.message;
  })
}

const delay = ms => new Promise(r => setTimeout(r, ms))

getAndUpdate();

