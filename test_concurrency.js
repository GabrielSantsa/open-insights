async function test() {
  const url = "https://82d4fc95-7938-46d6-91fc-c261b8279c3e.lovableproject.com/apps";
  const requests = Array.from({ length: 30 }, () => {
    const start = performance.now();
    return fetch(url)
      .then(res => ({
        duration: performance.now() - start,
        status: res.status
      }))
      .catch(err => ({
        duration: 0,
        error: err.message
      }));
  });

  const results = await Promise.all(requests);
  const durations = results.filter(r => r.duration > 0).map(r => r.duration);
  const successes = results.filter(r => r.status === 200).length;

  console.log(`Total requests: ${results.length}`);
  console.log(`Successful: ${successes}`);
  if (durations.length > 0) {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.log(`Average response time: ${(avg / 1000).toFixed(4)}s`);
    console.log(`Max response time: ${(Math.max(...durations) / 1000).toFixed(4)}s`);
  }
}

test();
