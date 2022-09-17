# Storyblok Utilities

A collection of scripts to update content on a Storyblok space

## Find and Replace

This script searches for a term in the content of the stories. It gets all stories containing that term, replaces it with the desired text (or in this case, a URL from a JSON file), and then uses the Storyblok Management API v1 to update each story.

A paginated fetch request wasn't implemented in this script, but as it only pulls stories matching the search term, you can keep running it until no more stories are found matching your term.

## Update Paths

This script updates the path parameter on all stories in a folder on our Storyblok space. 

### Why would you need to update the paths in bulk?

The URL of the pages in our Storyblok space was dynamic based on story data. For example:

    example.com/blog/CATEGORY-SLUG/STORY-SLUG
  
But all stored in one folder. Therefore the path would be something like:

    /blog/posts/story-slug

A workaround for this can be done in `getStaticPaths` or equivalent in whatever site generator you're using, but it renders the 'Internal Link' functionality of Storyblok useless - it creates a link to `/blog/posts/story-slug'.

When that path parameter is correct, though, the internal linking works as you would expect.

### How does it work?

It first gets all stories in a certain folder - `/blog/posts` in our case. It gets categories with a different request. This could be done in the same request if using `resolve_relations` but I was too lazy to do that and I think this code is actually simpler to understand. It will then loop through all stories, finding the correct category and building the correct path. It then uses the Storyblok Management API v1 to update each story. Each call to the API is defered as to not hit the rate limit of 3 per second.

