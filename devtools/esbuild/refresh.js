var source = new EventSource('/static/_esbuild/refresh?stream=build')
source.onmessage = function (event) {
  var data = JSON.parse(event.data)
  if (data.type === 'refresh') {
    location.reload()
  } else if (data.type === 'error') {
    console.error(data.message)
  }
}
