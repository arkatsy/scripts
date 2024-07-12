// Name: Search MDN Docs
// Description: Search MDN Docs

import "@johnlindquist/kit"

const searchIndexResponse = await get(
  `https://developer.mozilla.org/en-US/search-index.json`
)

const url = await arg('Select doc:',
  searchIndexResponse.data.map(({title, url}) => ({
    name: title,
    description: url,
    value: `https://developer.mozilla.org${url}`
  }))
)