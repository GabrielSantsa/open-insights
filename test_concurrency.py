import asyncio
import aiohttp
import time

async def fetch_apps(session, base_url):
    start = time.perf_counter()
    try:
        # Mocking the Supabase request headers if needed, but here we just test the app endpoint
        # or simulate the Supabase fetch directly if we had the service key.
        # Since I don't have the service key here, I'll simulate 30 parallel requests to the main app URL
        # and check response times.
        async with session.get(base_url) as response:
            status = response.status
            await response.text()
            end = time.perf_counter()
            return end - start, status
    except Exception as e:
        return 0, str(e)

async def main():
    url = "https://82d4fc95-7938-46d6-91fc-c261b8279c3e.lovableproject.com/apps"
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_apps(session, url) for _ in range(30)]
        results = await asyncio.gather(*tasks)
        
        times = [r[0] for r in results if isinstance(r[0], float) and r[0] > 0]
        statuses = [r[1] for r in results]
        
        if times:
            avg_time = sum(times) / len(times)
            max_time = max(times)
            min_time = min(times)
            print(f"Total requests: {len(results)}")
            print(f"Successful requests: {statuses.count(200)}")
            print(f"Average response time: {avg_time:.4f}s")
            print(f"Max response time: {max_time:.4f}s")
            print(f"Min response time: {min_time:.4f}s")
        else:
            print("All requests failed.")

if __name__ == "__main__":
    asyncio.run(main())
