import fetch from 'node-fetch';
import pagesJson from './newPages.json'

console.log(pagesJson.length, 'pages found in JSON')

const storyblokToken = process.env.STORYBLOK_TOKEN;
const spaceId = process.env.SPACE_ID;

const storyblokOAuthToken = process.env.STORYBLOK_OAUTH_TOKEN;

// What would you like to search for?
const searchTerm = "http://localhost:8888/index.php";
const postsURL = `https://api.storyblok.com/v2/cdn/stories/?`;

const findAndReplace = async () => {

  // setup API call parameters e.g. search/category, sort
  let params = {
    starts_with: 'blog/posts/',
    per_page: 40,
    sort_by: 'first_published_at:desc',
    token: storyblokToken,
    search_term: searchTerm,
  }

  let finalCounts = {};

  // get stories that match the search term
  const storyResponse = await fetch(postsURL + new URLSearchParams(params))
  if (!storyResponse.ok) {
    const message = `A FETCH error has occured: ${response.status}`;
    throw new Error(message);
  }
  const storyJSON = await storyResponse.json()
  console.log(storyJSON.stories.length, 'stories found matching search term')

  // loop through all stories to look for mentions of search term
  const resultArray = await Promise.all(
    storyJSON.stories.map(async (story, index) => asyncStoryFunction(story, index))
  )
  // turn results (an array of 'success' or error messages) into a object of their counts
  resultArray.forEach(function (x) { finalCounts[x] = (finalCounts[x] || 0) + 1; });
  console.log(finalCounts);
    
}

const updateStory = async (story) => {
  const storyObj = { story: story, publish: 1 }
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

const asyncStoryFunction = async (story, index) => {
  // get all elements in richtext content object
  const arrayOfRichTextElements = story?.content?.content?.content;
  // get all inner content of content objects (lots of 'content' objects, I know)
  const flatContentArray = arrayOfRichTextElements.flatMap(element => element.content)
  // get just the marks (which is what link objects are)
  const marksArray = flatContentArray.flatMap(element => element.marks ? element.marks : []);
  // loop through marks and fix 'em up!
  marksArray.map(item => checkAndReplaceMark(item)) 
  // console.log(JSON.stringify(story.content.content.content))
  // URL should be replaced now. So we can update using management API
  await delay(700 * index)
  //const result = await updateStory(story);
  const result = story.id;
  return result;
}

const checkAndReplaceMark = (item) => {
  if(item.type !== 'link') return true;
  if(item.attrs?.href.indexOf(searchTerm) != -1) {
    // only replace the URL (href attribute) if it matches our search term
    return replaceTerm(item);
  } else {
    return true;
  }
}


const replaceTerm = async (mark) => {
  let href = mark.attrs?.href;
  if(!href) return mark;
  // our page JSON doesn't include trailing slash so we remove it if it's present on the mark object
  href = removeTrailingSlash(href);
  // extract the slug from the href (the full url)
  const slug = href.substring(href.lastIndexOf('/') + 1);
  // use the slug to find the right object in our JSON array
  const newPage = pagesJson.find(item => item.slug == slug)
  // finally, replace the href property with the new page URL
  mark.attrs.href = newPage.newUrl;
  return mark;
}

function removeTrailingSlash(str) {
  return str.endsWith('/') ? str.slice(0, -1) : str;
}

const delay = ms => new Promise(r => setTimeout(r, ms))

findAndReplace();

