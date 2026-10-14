# Tech, official vendor, and research source catalog

Checked 2026-10-14T20:39:18.984Z. Run `node scripts/catalog-tech.mjs` to repeat discovery and validation, or `node scripts/catalog-tech.mjs --skip-discovery` to recheck the saved candidates.

- 139 publisher-owned discovery pages configured; 0 checked in this run.
- 177 distinct candidate feed/page endpoints GET-tested or excluded by their robots policy.
- 101 parseable public feeds across 52 publisher/project identities; 76 failures/pages retained as evidence. These are endpoint counts, not claims of independent editorial sources.
- 6 valid endpoints are marked `validation.duplicateOf` because they redirect to the same endpoint or currently contain the same complete article URL set within a publisher. Retain evidence but avoid activating redundant aliases; 95 nonredundant validated feeds remain.
- 45 feeds currently yield qualifying AI articles in the strict preceding 24-hour window. AI filtering uses the app parser; `aiOnly` is set only for explicitly AI-focused organizations/pages and is disabled for broader sitewide feeds advertised on AI category pages. No timestamps are replaced.

## Method and limits

Candidates come from actual RSS/Atom alternate links or feed links on the publisher's own discovery page. No guessed feed route is accepted. A page with no advertised feed remains a failed page candidate, rather than becoming a fabricated feed. Feed validation checks HTTP response, rejects DTD/custom entities, parses RSS/Atom/RDF, counts unfiltered XML entries, and records latest publisher publication plus the app's fresh AI count. HTTP 200 alone is insufficient. Requests use an 8-second timeout, global concurrency 8, per-origin serialization, and a 2 MB response cap. Robots rules for the catalog user agent or wildcard are honored; unavailable robots responses are skipped conservatively. ZDNet was excluded after the web research tool reported a nonretryable robots block. No cookies, logins, private APIs, paywall workarounds, or generated RSS proxies were used.

First-party feeds are authoritative for announcements about their own products; they are not independent validation of vendor claims. Broad tech feeds require article-level AI filtering. University/research feeds can be slow-moving and can have zero fresh stories even when valid. Feed aliases and overlapping category feeds should be deduplicated by canonical article URL before production use. Discovery failures may reflect transient availability or publisher HTML changes; they are not proof that the publisher has no feed anywhere.

## Primary discovery references

- [Ars Technica feed directory](https://arstechnica.com/rss-feeds/)
- [WIRED feed directory](https://www.wired.com/about/rss-feeds/)
- [TechRadar RSS guide](https://www.techradar.com/how-to/techradar-rss)
- Every candidate retains its exact `discoveryUrl` and method in the JSON catalog.

## Candidate results

| Name | Kind | URL | HTTP | Valid feed | Entries | Latest publication UTC | Fresh AI | Error / exclusion |
|---|---|---|---:|---|---:|---|---:|---|
| Ars Technica — All News | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/index) | 200 | yes | 20 | 2026-10-14T19:10:58.000Z | 3 |  |
| Ars Technica — Ars Features | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/features) | 200 | yes | 20 | 2026-10-14T11:00:30.000Z | 1 |  |
| Ars Technica — Technology Lab | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/technology-lab) | 200 | yes | 20 | 2026-10-14T12:55:06.000Z | 1 |  |
| Ars Technica — Gear & Gadgets | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/gadgets) | 200 | yes | 20 | 2026-10-14T13:56:11.000Z | 0 |  |
| Ars Technica — Law & Disorder | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/tech-policy) | 200 | yes | 20 | 2026-10-14T16:41:49.000Z | 1 |  |
| Ars Technica — Infinite Loop | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/apple) | 200 | yes | 20 | 2026-10-13T15:29:17.000Z | 0 |  |
| Ars Technica — The Scientific Method | publisher | [endpoint](https://feeds.arstechnica.com/arstechnica/science) | 200 | yes | 20 | 2026-10-14T17:10:15.000Z | 1 |  |
| WIRED | publisher | [endpoint](https://www.wired.com/feed/rss) | 200 | yes | 50 | 2026-10-14T18:15:00.000Z | 4 |  |
| WIRED — Business | publisher | [endpoint](https://www.wired.com/feed/category/business/latest/rss) | 200 | yes | 20 | 2026-10-14T18:15:00.000Z | 2 |  |
| WIRED — Artificial Intelligence | publisher | [endpoint](https://www.wired.com/feed/tag/ai/latest/rss) | 200 | yes | 10 | 2026-10-14T18:15:00.000Z | 4 |  |
| WIRED — Gear | publisher | [endpoint](https://www.wired.com/feed/category/gear/latest/rss) | 200 | yes | 20 | 2026-10-14T13:00:00.000Z | 1 |  |
| WIRED — Ideas | publisher | [endpoint](https://www.wired.com/feed/category/ideas/latest/rss) | 200 | yes | 20 | 2024-06-19T15:00:00.000Z | 0 |  |
| WIRED — Science | publisher | [endpoint](https://www.wired.com/feed/category/science/latest/rss) | 200 | yes | 20 | 2026-10-14T18:15:00.000Z | 1 |  |
| WIRED — Security | publisher | [endpoint](https://www.wired.com/feed/category/security/latest/rss) | 200 | yes | 20 | 2026-10-13T23:17:59.000Z | 0 |  |
| WIRED — Backchannel | publisher | [endpoint](https://www.wired.com/feed/category/backchannel/latest/rss) | 200 | yes | 20 | 2026-10-14T10:00:00.000Z | 0 |  |
| WIRED — WIRED Guides | publisher | [endpoint](https://www.wired.com/feed/tag/wired-guide/latest/rss) | 200 | yes | 20 | 2023-02-22T15:00:00.000Z | 0 |  |
| TechRadar | publisher | [endpoint](https://www.techradar.com/how-to/techradar-rss) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| TechCrunch AI — TechCrunch &raquo; Feed | publisher | [endpoint](https://techcrunch.com/feed/) | 200 | yes | 20 | 2026-10-14T20:26:25.000Z | 10 |  |
| TechCrunch AI — TechCrunch &raquo; AI Category Feed | publisher | [endpoint](https://techcrunch.com/category/artificial-intelligence/feed/) | 200 | yes | 20 | 2026-10-14T18:23:46.000Z | 10 |  |
| The Verge AI — The Verge | publisher | [endpoint](https://www.theverge.com/rss/index.xml) | 200 | yes | 10 | 2026-10-14T20:03:43.000Z | 4 |  |
| The Verge AI — AI | publisher | [endpoint](https://www.theverge.com/rss/ai-artificial-intelligence/index.xml) | 200 | yes | 10 | 2026-10-14T19:06:03.000Z | 9 |  |
| VentureBeat | publisher | [endpoint](https://venturebeat.com/) | 429 | no | 0 | — | 0 | HTTP 429 |
| VentureBeat RSS | publisher | [endpoint](https://venturebeat.com/rss/) | 429 | no | 0 | — | 0 | HTTP 429 |
| Engadget — News - Engadget | publisher | [endpoint](https://www.engadget.com/category/news/feed/) | 200 | yes | 20 | 2026-10-14T19:25:28.000Z | 3 |  |
| Engadget | publisher | [endpoint](https://www.engadget.com/feed/) | 200 | yes | 20 | 2026-10-14T20:13:18.000Z | 4 |  |
| Tom’s Hardware | publisher | [endpoint](https://www.tomshardware.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Tom’s Guide | publisher | [endpoint](https://www.tomsguide.com/) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| PCWorld — PCWorld &raquo; Feed | publisher | [endpoint](https://www.pcworld.com/feed) | 200 | yes | 20 | 2026-10-14T17:15:05.000Z | 4 |  |
| Computerworld — Computerworld &raquo; Feed | publisher | [endpoint](https://www.computerworld.com/feed/) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| InfoWorld — InfoWorld &raquo; Feed | publisher | [endpoint](https://www.infoworld.com/feed/) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| The Register | publisher | [endpoint](https://www.theregister.com/) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| The Register AI | publisher | [endpoint](https://www.theregister.com/software/ai_ml/) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| The Next Web | publisher | [endpoint](https://thenextweb.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| SiliconANGLE | publisher | [endpoint](https://siliconangle.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| The New Stack | publisher | [endpoint](https://thenewstack.io/blog/feed/) | 200 | yes | 26 | 2026-10-14T17:47:11.000Z | 5 |  |
| InfoQ | publisher | [endpoint](https://www.infoq.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| SD Times — SD Times &raquo; Feed | publisher | [endpoint](https://sdtimes.com/feed/) | 200 | yes | 10 | 2026-10-14T20:13:19.000Z | 3 |  |
| DevClass | publisher | [endpoint](https://devclass.com/) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| Data Center Dynamics | publisher | [endpoint](https://www.datacenterdynamics.com/en/) | 403 | no | 0 | — | 0 | HTTP 403 |
| Datanami | publisher | [endpoint](https://www.datanami.com/) | — | no | 0 | — | 0 | robots.txt unavailable (403); not bypassed |
| Analytics India Magazine — AIM RSS Feed | publisher | [endpoint](https://analyticsindiamag.com/feed) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Unite.AI — Unite.AI — RSS | publisher | [endpoint](https://www.unite.ai/feed/) | 200 | yes | 25 | 2026-10-14T19:58:08.000Z | 19 |  |
| AI News | publisher | [endpoint](https://www.artificialintelligence-news.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| MarkTechPost | publisher | [endpoint](https://www.marktechpost.com/) | 403 | no | 0 | — | 0 | HTTP 403 |
| Machine Learning Mastery — MachineLearningMastery.com &raquo; Feed | publisher | [endpoint](https://feeds.feedburner.com/MachineLearningMastery) | 200 | yes | 10 | 2026-10-14T11:00:00.000Z | 1 |  |
| Machine Learning Mastery | publisher | [endpoint](https://machinelearningmastery.com/feed/) | 200 | yes | 10 | 2026-10-14T11:00:00.000Z | 1 |  |
| IEEE Spectrum — IEEE Spectrum | publisher | [endpoint](https://spectrum.ieee.org/feeds/feed.rss) | 200 | yes | 30 | 2026-10-14T18:00:03.000Z | 0 |  |
| IEEE Spectrum | publisher | [endpoint](https://spectrum.ieee.org/customfeeds/feed/all-topics/rss) | 200 | yes | 20 | 2026-10-14T12:00:03.000Z | 1 |  |
| TechSpot | publisher | [endpoint](https://www.techspot.com/) | 403 | no | 0 | — | 0 | HTTP 403 |
| CNET | publisher | [endpoint](https://www.cnet.com/rss/all/) | 200 | yes | 25 | 2026-10-14T20:04:26.000Z | 2 |  |
| Fast Company AI | publisher | [endpoint](https://www.fastcompany.com/section/artificial-intelligence) | 403 | no | 0 | — | 0 | HTTP 403 |
| MIT Technology Review | publisher | [endpoint](https://www.technologyreview.com/feed/) | 200 | yes | 10 | 2026-10-14T12:10:00.000Z | 0 |  |
| OpenAI | official | [endpoint](https://openai.com/news/) | 403 | no | 0 | — | 0 | HTTP 403 |
| Anthropic | official | [endpoint](https://www.anthropic.com/news) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Google AI | official | [endpoint](https://blog.google/feed) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Google AI | official | [endpoint](https://blog.google/rss/) | 200 | yes | 20 | 2026-10-14T16:15:00.000Z | 4 |  |
| Google Developers | official | [endpoint](https://developers.googleblog.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Google Cloud | official | [endpoint](https://cloud.google.com/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Google Workspace | official | [endpoint](https://workspace.google.com/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Google DeepMind | official | [endpoint](https://deepmind.google/discover/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Microsoft — The Official Microsoft Blog &raquo; Feed | official | [endpoint](https://blogs.microsoft.com/feed/) | 200 | yes | 10 | 2026-10-12T13:01:29.000Z | 0 |  |
| Microsoft AI — Source &raquo; Feed | official | [endpoint](https://news.microsoft.com/source/feed/) | 200 | yes | 10 | 2026-10-14T18:41:41.000Z | 1 |  |
| Microsoft AI — Source &raquo; AI Category Feed | official | [endpoint](https://news.microsoft.com/source/topics/ai/feed/) | 200 | yes | 10 | 2026-10-12T13:14:40.000Z | 0 |  |
| Microsoft Azure — Microsoft Azure Blog &raquo; Feed | official | [endpoint](https://azure.microsoft.com/en-us/blog/feed/) | 200 | yes | 10 | 2026-10-07T15:00:00.000Z | 0 |  |
| Microsoft 365 — AI at Work Blog &raquo; Feed | official | [endpoint](https://www.microsoft.com/en-us/copilot/blog/feed/) | 200 | yes | 10 | 2026-09-25T12:07:25.000Z | 0 |  |
| Microsoft Developer Blogs | official | [endpoint](https://devblogs.microsoft.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Microsoft Semantic Kernel | official | [endpoint](https://devblogs.microsoft.com/agent-framework/feed/) | 200 | yes | 10 | 2026-09-24T15:00:14.000Z | 0 |  |
| Microsoft Foundry | official | [endpoint](https://devblogs.microsoft.com/foundry/feed/) | 200 | yes | 10 | 2026-10-14T15:38:56.000Z | 1 |  |
| Microsoft .NET | official | [endpoint](https://devblogs.microsoft.com/dotnet/feed/) | 200 | yes | 10 | 2026-10-13T19:40:00.000Z | 0 |  |
| Visual Studio | official | [endpoint](https://devblogs.microsoft.com/visualstudio/feed/) | 200 | yes | 10 | 2026-10-14T14:00:25.000Z | 0 |  |
| Visual Studio Code | official | [endpoint](https://code.visualstudio.com/feed.xml) | 200 | yes | 42 | 2026-10-21T17:00:00.000Z | 0 |  |
| Windows Developer — Subscribe to RSS | official | [endpoint](https://blogs.windows.com/windowsdeveloper/feed) | 200 | yes | 10 | 2026-10-14T17:00:05.000Z | 0 |  |
| AWS News | official | [endpoint](https://aws.amazon.com/blogs/aws/feed/) | 200 | yes | 20 | 2026-10-14T19:30:48.000Z | 0 |  |
| AWS AI | official | [endpoint](https://aws.amazon.com/blogs/machine-learning/feed/) | 200 | yes | 20 | 2026-10-14T16:24:07.000Z | 4 |  |
| AWS Big Data | official | [endpoint](https://aws.amazon.com/blogs/big-data/feed/) | 200 | yes | 20 | 2026-10-13T20:16:48.000Z | 0 |  |
| AWS Compute | official | [endpoint](https://aws.amazon.com/blogs/compute/feed/) | 200 | yes | 20 | 2026-10-14T16:55:24.000Z | 1 |  |
| AWS Architecture | official | [endpoint](https://aws.amazon.com/blogs/architecture/feed/) | 200 | yes | 20 | 2026-10-14T14:31:55.000Z | 1 |  |
| AWS Startups | official | [endpoint](https://aws.amazon.com/blogs/startups/feed/) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| AWS Open Source | official | [endpoint](https://aws.amazon.com/blogs/opensource/feed/) | 200 | yes | 20 | 2026-10-07T17:36:46.000Z | 0 |  |
| NVIDIA Generative AI — NVIDIA Blog &raquo; Feed | official | [endpoint](https://blogs.nvidia.com/feed/) | 200 | yes | 18 | 2026-10-14T06:04:15.000Z | 1 |  |
| NVIDIA Generative AI — NVIDIA Blog &raquo; AI Category Feed | official | [endpoint](https://blogs.nvidia.com/blog/category/generative-ai/feed/) | 200 | yes | 18 | 2026-10-14T06:04:15.000Z | 2 |  |
| NVIDIA Developer | official | [endpoint](https://developer.nvidia.com/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Hugging Face — Hugging Face Blog | official | [endpoint](https://huggingface.co/blog/feed.xml) | 200 | yes | 876 | 2026-10-14T16:12:42.000Z | 1 |  |
| IBM Think | official | [endpoint](https://www.ibm.com/think/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Meta AI | official | [endpoint](https://ai.meta.com/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Meta Engineering — Engineering at Meta &raquo; Feed | official | [endpoint](https://engineering.fb.com/feed/) | 200 | yes | 9 | 2026-10-13T16:01:00.000Z | 0 |  |
| Meta Engineering — Subscribe | official | [endpoint](https://code.facebook.com/posts/rss/) | 200 | yes | 9 | 2026-10-13T16:01:00.000Z | 0 |  |
| Oracle AI — Oracle Blogs | official | [endpoint](https://blogs.oracle.com/rss) | 200 | yes | 4 | 2025-10-01T22:35:25.000Z | 0 |  |
| Oracle AI — ai-data-science &raquo; Feed | official | [endpoint](https://blogs.oracle.com/ai-and-datascience/feed) | 200 | yes | 277 | 2026-10-14T16:00:00.000Z | 1 |  |
| Cohere | official | [endpoint](https://cohere.com/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Mistral AI — Mistral | official | [endpoint](https://mistral.ai/news/rss) | 200 | yes | 89 | 2026-10-06T12:00:27.000Z | 0 |  |
| AI21 Labs | official | [endpoint](https://www.ai21.com/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Stability AI | official | [endpoint](https://stability.ai/news) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Perplexity | official | [endpoint](https://www.perplexity.ai/hub/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Runway | official | [endpoint](https://runwayml.com/research) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| ElevenLabs | official | [endpoint](https://elevenlabs.io/blog/rss.xml) | 200 | yes | 50 | 2026-10-14T12:00:00.000Z | 1 |  |
| xAI | official | [endpoint](https://x.ai/news) | 403 | no | 0 | — | 0 | HTTP 403 |
| LangChain | official | [endpoint](https://blog.langchain.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| LlamaIndex | official | [endpoint](https://www.llamaindex.ai/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Ollama — Ollama Blog RSS | official | [endpoint](https://ollama.com/blog/rss.xml) | 200 | yes | 60 | 2026-10-13T00:00:00.000Z | 0 |  |
| vLLM | official | [endpoint](https://vllm.ai/blog/rss.xml) | 200 | yes | 50 | 2026-10-14T00:00:00.000Z | 1 |  |
| vLLM | official | [endpoint](https://vllm.ai/blog/atom.xml) | 200 | yes | 50 | 2026-10-14T00:00:00.000Z | 0 |  |
| Modal — Modal Blog Feed | official | [endpoint](https://modal.com/blog/atom.xml) | 200 | yes | 143 | 2026-10-14T00:00:00.000Z | 0 |  |
| Replicate | official | [endpoint](https://replicate.com/blog/rss) | 200 | yes | 121 | 2026-04-15T00:00:00.000Z | 0 |  |
| Replicate | official | [endpoint](https://replicate.com/blog/atom) | 200 | yes | 121 | 2026-04-15T00:00:00.000Z | 0 |  |
| Together AI — Together AI Blog | official | [endpoint](https://www.together.ai/blog/rss.xml) | 200 | yes | 100 | 2026-10-06T00:00:00.000Z | 0 |  |
| Fireworks AI | official | [endpoint](https://fireworks.ai/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Groq | official | [endpoint](https://groq.com/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Baseten | official | [endpoint](https://www.baseten.co/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Cerebras | official | [endpoint](https://www.cerebras.ai/blog) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| SambaNova | official | [endpoint](https://sambanova.ai/blog/rss.xml) | 200 | yes | 10 | 2026-10-07T16:56:47.000Z | 0 |  |
| Weights & Biases | official | [endpoint](https://wandb.ai/fully-connected) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Lightning AI | official | [endpoint](https://lightning.ai/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| H2O.ai | official | [endpoint](https://h2o.ai/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Anaconda — Anaconda &raquo; Feed | official | [endpoint](https://www.anaconda.com/feed) | 200 | yes | 10 | 2026-10-14T16:02:41.000Z | 2 |  |
| Dataiku | official | [endpoint](https://blog.dataiku.com/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| DataRobot — DataRobot &raquo; Blogs Feed | official | [endpoint](https://www.datarobot.com/blog/feed/) | 200 | yes | 10 | 2026-09-30T18:10:02.000Z | 0 |  |
| ClearML — ClearML &raquo; Feed | official | [endpoint](https://clear.ml/feed) | 200 | yes | 10 | 2026-09-29T22:27:37.000Z | 0 |  |
| BentoML | official | [endpoint](https://www.bentoml.com/blog) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| MLflow — MLflow RSS Feed | official | [endpoint](https://mlflow.org/blog/rss.xml) | 200 | yes | 20 | 2026-09-25T00:00:00.000Z | 0 |  |
| MLflow — MLflow Atom Feed | official | [endpoint](https://mlflow.org/blog/atom.xml) | 200 | yes | 20 | 2026-09-25T00:00:00.000Z | 0 |  |
| Neptune.ai | official | [endpoint](https://neptune.ai/blog) | — | no | 0 | — | 0 | robots.txt unavailable (TypeError); not bypassed |
| Evidently AI | official | [endpoint](https://www.evidentlyai.com/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Arize AI — Arize AI &raquo; Feed | official | [endpoint](https://arize.com/feed/) | 200 | yes | 10 | 2026-10-13T16:00:15.000Z | 0 |  |
| Arize AI — Arize AI &raquo; Stories Feed | official | [endpoint](https://arize.com/web-stories/feed/) | 200 | yes | 0 | — | 0 |  |
| Pinecone | official | [endpoint](https://www.pinecone.io/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Weaviate — Weaviate RSS Feed | official | [endpoint](https://weaviate.io/blog/rss.xml) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| Weaviate — Weaviate Atom Feed | official | [endpoint](https://weaviate.io/blog/atom.xml) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| Qdrant | official | [endpoint](https://qdrant.tech/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Chroma | official | [endpoint](https://www.trychroma.com/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Milvus | official | [endpoint](https://milvus.io/blog) | — | no | 0 | — | 0 | TypeError: fetch failed |
| Zilliz | official | [endpoint](https://zilliz.com/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Databricks | official | [endpoint](https://www.databricks.com/feed) | 200 | yes | 10 | 2026-10-15T00:06:48.000Z | 0 |  |
| Snowflake | official | [endpoint](https://www.snowflake.com/en/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Confluent | official | [endpoint](https://www.confluent.io/rss.xml) | 200 | yes | 10 | 2026-10-01T13:31:07.000Z | 0 |  |
| Redis | official | [endpoint](https://redis.io/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| GitHub — The GitHub Blog &raquo; Feed | official | [endpoint](https://github.blog/feed/) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| GitHub | official | [endpoint](https://atom.io/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| GitLab | official | [endpoint](https://about.gitlab.com/atom.xml) | 200 | yes | 20 | 2026-10-13T00:00:00.000Z | 0 |  |
| Docker — Docker &raquo; Feed | official | [endpoint](https://www.docker.com/feed/) | 200 | yes | 10 | 2026-10-12T16:00:00.000Z | 0 |  |
| Docker | official | [endpoint](https://www.docker.com/blog/feed) | 200 | yes | 10 | 2026-10-12T16:00:00.000Z | 0 |  |
| Kubernetes — Kubernetes | official | [endpoint](https://kubernetes.io/feed.xml) | 200 | yes | 50 | 2026-10-06T18:00:00.000Z | 0 |  |
| Cloudflare — Cloudflare Blog | official | [endpoint](https://blog.cloudflare.com/rss/) | 200 | yes | 20 | 2026-10-14T20:24:19.000Z | 0 |  |
| Vercel | official | [endpoint](https://vercel.com/atom) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| Netlify — Netlify Blog | official | [endpoint](https://www.netlify.com/feed.xml) | 200 | yes | 30 | 2026-09-29T12:00:00.000Z | 0 |  |
| Netlify — Netlify Changelog | official | [endpoint](https://www.netlify.com/changelog/feed.xml) | 200 | yes | 324 | 2026-10-14T00:00:00.000Z | 0 |  |
| Replit | official | [endpoint](https://blog.replit.com/) | — | no | 0 | — | 0 | robots.txt unavailable (525); not bypassed |
| Cursor | official | [endpoint](https://cursor.com/blog) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Windsurf — Devin Blog | official | [endpoint](https://devin.ai/rss.xml) | 200 | yes | 218 | 2026-10-13T18:00:00.000Z | 0 |  |
| Sourcegraph — Sourcegraph Blog | official | [endpoint](https://sourcegraph.com/blog/feed.rss) | 200 | yes | 30 | 2026-09-21T00:00:00.000Z | 0 |  |
| Continue | official | [endpoint](https://blog.continue.dev/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Tabnine | official | [endpoint](https://www.tabnine.com/blog/) | — | no | 0 | — | 0 | robots.txt unavailable (502); not bypassed |
| Google Research | research | [endpoint](https://research.google/blog/rss/) | 200 | yes | 100 | 2026-10-14T16:14:34.000Z | 1 |  |
| Microsoft Research — Microsoft Research &raquo; Feed | research | [endpoint](https://www.microsoft.com/en-us/research/feed/) | 200 | yes | 10 | 2026-10-12T16:00:00.000Z | 0 |  |
| Apple Machine Learning Research | research | [endpoint](https://machinelearning.apple.com/rss.xml) | 200 | yes | 10 | 2026-10-14T00:00:00.000Z | 2 |  |
| Amazon Science | research | [endpoint](https://www.amazon.science/index.rss) | 200 | yes | 25 | 2026-10-12T17:36:18.000Z | 0 |  |
| Salesforce AI Research — Salesforce &raquo; Feed | research | [endpoint](https://www.salesforce.com/blog/feed/) | 200 | yes | 10 | 2026-10-14T20:32:14.000Z | 2 |  |
| Salesforce AI Research — Salesforce &raquo; AI Research Blog Feed | research | [endpoint](https://www.salesforce.com/blog/category/ai-research/feed/) | 200 | yes | 10 | 2026-09-30T13:00:00.000Z | 0 |  |
| Berkeley AI Research | research | [endpoint](https://bair.berkeley.edu/blog/feed.xml) | 200 | yes | 10 | 2026-07-29T09:00:00.000Z | 0 |  |
| Stanford AI Lab — The Stanford AI Lab Blog | research | [endpoint](https://ai.stanford.edu/blog/feed.xml) | 200 | yes | 15 | 2022-05-31T07:00:00.000Z | 0 |  |
| Stanford CRFM | research | [endpoint](https://crfm.stanford.edu/blog.html) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| CMU Machine Learning — Machine Learning Blog / ML@CMU / Carnegie Mellon University &raquo; Feed | research | [endpoint](https://blog.ml.cmu.edu/feed/) | 200 | yes | 1 | 2026-08-10T21:52:23.000Z | 0 |  |
| MIT CSAIL | research | [endpoint](https://www.csail.mit.edu/news) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| MIT AI News — News Articles | research | [endpoint](https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml) | 200 | yes | 50 | 2026-10-14T15:00:00.000Z | 3 |  |
| MIT AI News | research | [endpoint](https://news.mit.edu/rss) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Allen Institute for AI — Ai2 RSS Feeds | research | [endpoint](https://allenai.org/rss.xml) | 200 | yes | 25 | 2026-10-14T08:00:00.000Z | 1 |  |
| EleutherAI | research | [endpoint](https://www.eleuther.ai/blog) | 404 | no | 0 | — | 0 | HTTP 404 |
| LAION | research | [endpoint](https://laion.ai/blog/) | 200 | no | 0 | — | 0 | DTD/HTML response rejected; not an approved feed |
| Oxford Machine Learning | research | [endpoint](https://www.robots.ox.ac.uk/~parg/) | — | no | 0 | — | 0 | robots.txt disallows this path; not bypassed |
| TechRadar | publisher | [endpoint](https://www.techradar.com/feeds.xml) | 200 | yes | 50 | 2026-10-14T19:35:00.000Z | 14 |  |
| TechRadar | publisher | [endpoint](https://www.techradar.com/feeds/tag/tech) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| TechRadar | publisher | [endpoint](https://www.techradar.com/feeds/articletype/how-to) | 200 | yes | 50 | 2026-10-14T02:30:00.000Z | 0 |  |
| Tom’s Hardware | publisher | [endpoint](https://www.tomshardware.com/feeds.xml) | 200 | yes | 50 | 2026-10-14T18:09:38.000Z | 2 |  |
| Tom’s Guide | publisher | [endpoint](https://www.tomsguide.com/feeds.xml) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |
| Stability AI | official | [endpoint](https://stability.ai/news-updates?format=rss) | 200 | yes | 20 | 2026-08-25T14:59:22.000Z | 0 |  |
| Qdrant — Qdrant - Vector Search Engine | official | [endpoint](https://qdrant.tech/blog/index.xml) | 200 | yes | 196 | 2026-10-14T00:00:00.000Z | 1 |  |
| GitLab — Major Releases | official | [endpoint](https://about.gitlab.com/releases.xml) | 200 | no | 0 | — | 0 | Response exceeds 2000000 bytes |

## Discovery page evidence

| Page | HTTP | Feed links found | Error / note |
|---|---:|---:|---|
| [TechCrunch](https://techcrunch.com/) | 200 | 1 |  |
| [Ars Technica](https://arstechnica.com/rss-feeds/) | 200 | 7 |  |
| [TechCrunch AI](https://techcrunch.com/category/artificial-intelligence/) | 200 | 2 |  |
| [WIRED](https://www.wired.com/about/rss-feeds/) | 200 | 9 |  |
| [VentureBeat](https://venturebeat.com/) | 429 | 0 | HTTP 429 |
| [TechRadar](https://www.techradar.com/how-to/techradar-rss) | 200 | 3 | Response exceeds 2000000 bytes |
| [The Verge](https://www.theverge.com/) | 200 | 1 |  |
| [VentureBeat RSS](https://venturebeat.com/rss/) | 429 | 0 | HTTP 429 |
| [The Verge AI](https://www.theverge.com/ai-artificial-intelligence) | 200 | 2 |  |
| [Engadget](https://www.engadget.com/) | 200 | 2 |  |
| [Tom’s Hardware](https://www.tomshardware.com/) | 200 | 1 |  |
| [Tom’s Guide](https://www.tomsguide.com/) | 200 | 1 | Response exceeds 2000000 bytes |
| [The Register](https://www.theregister.com/) | — | 0 | robots.txt disallows this path; not bypassed |
| [The Register AI](https://www.theregister.com/software/ai_ml/) | — | 0 | robots.txt disallows this path; not bypassed |
| [The Next Web](https://thenextweb.com/) | 200 | 0 | No advertised feed found on this public page |
| [The New Stack](https://thenewstack.io/) | 200 | 1 |  |
| [SiliconANGLE](https://siliconangle.com/) | 200 | 0 | No advertised feed found on this public page |
| [Computerworld](https://www.computerworld.com/) | 200 | 1 |  |
| [InfoWorld](https://www.infoworld.com/) | 200 | 1 |  |
| [PCWorld](https://www.pcworld.com/) | 200 | 1 |  |
| [InfoQ](https://www.infoq.com/) | 200 | 0 | No advertised feed found on this public page |
| [SD Times](https://sdtimes.com/) | 200 | 1 |  |
| [Unite.AI](https://www.unite.ai/) | 200 | 1 |  |
| [Datanami](https://www.datanami.com/) | — | 0 | robots.txt unavailable (403); not bypassed |
| [Data Center Dynamics](https://www.datacenterdynamics.com/en/) | 403 | 0 | HTTP 403 |
| [Machine Learning Mastery](https://machinelearningmastery.com/) | 200 | 2 |  |
| [DevClass](https://devclass.com/) | — | 0 | robots.txt disallows this path; not bypassed |
| [TechSpot](https://www.techspot.com/) | 403 | 0 | HTTP 403 |
| [IEEE Spectrum](https://spectrum.ieee.org/) | 200 | 2 |  |
| [Analytics India Magazine](https://analyticsindiamag.com/) | 200 | 1 |  |
| [MarkTechPost](https://www.marktechpost.com/) | 403 | 0 | HTTP 403 |
| [OpenAI](https://openai.com/news/) | 403 | 0 | HTTP 403 |
| [MIT Technology Review](https://www.technologyreview.com/) | 200 | 1 |  |
| [Fast Company AI](https://www.fastcompany.com/section/artificial-intelligence) | 403 | 0 | HTTP 403 |
| [Google](https://blog.google/) | 200 | 2 |  |
| [Anthropic](https://www.anthropic.com/news) | 200 | 0 | No advertised feed found on this public page |
| [AI News](https://www.artificialintelligence-news.com/) | 200 | 0 | No advertised feed found on this public page |
| [Google AI](https://blog.google/technology/ai/) | 200 | 2 |  |
| [Google Workspace](https://workspace.google.com/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Microsoft](https://blogs.microsoft.com/) | 200 | 1 |  |
| [Google Cloud](https://cloud.google.com/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Microsoft Developer Blogs](https://devblogs.microsoft.com/) | 200 | 0 | No advertised feed found on this public page |
| [Microsoft AI](https://blogs.microsoft.com/ai/) | 200 | 2 |  |
| [Microsoft 365](https://www.microsoft.com/en-us/microsoft-365/blog/) | 200 | 1 |  |
| [Google DeepMind](https://deepmind.google/discover/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Microsoft Semantic Kernel](https://devblogs.microsoft.com/semantic-kernel/) | 200 | 1 |  |
| [Microsoft Foundry](https://devblogs.microsoft.com/foundry/) | 200 | 1 |  |
| [Microsoft Azure](https://azure.microsoft.com/en-us/blog/) | 200 | 1 |  |
| [Microsoft .NET](https://devblogs.microsoft.com/dotnet/) | 200 | 1 |  |
| [Visual Studio](https://devblogs.microsoft.com/visualstudio/) | 200 | 1 |  |
| [Google Developers](https://developers.googleblog.com/) | 200 | 0 | No advertised feed found on this public page |
| [Windows Developer](https://blogs.windows.com/windowsdeveloper/) | 200 | 1 |  |
| [AWS News](https://aws.amazon.com/blogs/aws/) | 200 | 1 |  |
| [AWS AI](https://aws.amazon.com/blogs/machine-learning/) | 200 | 1 |  |
| [AWS Big Data](https://aws.amazon.com/blogs/big-data/) | 200 | 1 |  |
| [AWS Compute](https://aws.amazon.com/blogs/compute/) | 200 | 1 |  |
| [AWS Architecture](https://aws.amazon.com/blogs/architecture/) | 200 | 1 |  |
| [NVIDIA](https://blogs.nvidia.com/) | 200 | 1 |  |
| [AWS Startups](https://aws.amazon.com/blogs/startups/) | 200 | 1 |  |
| [NVIDIA Generative AI](https://blogs.nvidia.com/blog/category/generative-ai/) | 200 | 2 |  |
| [CNET](https://www.cnet.com/) | 200 | 1 |  |
| [AWS Open Source](https://aws.amazon.com/blogs/opensource/) | 200 | 1 |  |
| [NVIDIA Developer](https://developer.nvidia.com/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Hugging Face](https://huggingface.co/blog) | 200 | 1 |  |
| [Meta Engineering](https://engineering.fb.com/) | 200 | 2 |  |
| [IBM Think](https://www.ibm.com/think/) | 200 | 0 | No advertised feed found on this public page |
| [AI21 Labs](https://www.ai21.com/blog) | 200 | 0 | No advertised feed found on this public page |
| [Oracle AI](https://blogs.oracle.com/ai-and-datascience/) | 200 | 2 |  |
| [Cohere](https://cohere.com/blog) | 200 | 0 | No advertised feed found on this public page |
| [Perplexity](https://www.perplexity.ai/hub/blog) | 200 | 0 | No advertised feed found on this public page |
| [Mistral AI](https://mistral.ai/news) | 200 | 1 |  |
| [xAI](https://x.ai/news) | 403 | 0 | HTTP 403 |
| [Stability AI](https://stability.ai/news) | 200 | 1 |  |
| [ElevenLabs](https://elevenlabs.io/blog) | 200 | 1 |  |
| [Runway](https://runwayml.com/research) | 200 | 0 | No advertised feed found on this public page |
| [Meta AI](https://ai.meta.com/blog/) | 200 | 0 | No advertised feed found on this public page |
| [LlamaIndex](https://www.llamaindex.ai/blog) | 200 | 0 | No advertised feed found on this public page |
| [Ollama](https://ollama.com/blog) | 200 | 1 |  |
| [LangChain](https://blog.langchain.com/) | 200 | 0 | No advertised feed found on this public page |
| [Modal](https://modal.com/blog) | 200 | 1 |  |
| [Together AI](https://www.together.ai/blog) | 200 | 1 |  |
| [vLLM](https://blog.vllm.ai/) | 200 | 2 |  |
| [Replicate](https://replicate.com/blog) | 200 | 2 |  |
| [Groq](https://groq.com/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Fireworks AI](https://fireworks.ai/blog) | 200 | 0 | No advertised feed found on this public page |
| [SambaNova](https://sambanova.ai/blog) | 200 | 1 |  |
| [Lightning AI](https://lightning.ai/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Anaconda](https://www.anaconda.com/blog) | 200 | 1 |  |
| [H2O.ai](https://h2o.ai/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Weights & Biases](https://wandb.ai/fully-connected) | 200 | 0 | No advertised feed found on this public page |
| [DataRobot](https://www.datarobot.com/blog/) | 200 | 1 |  |
| [Baseten](https://www.baseten.co/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Neptune.ai](https://neptune.ai/blog) | — | 0 | robots.txt unavailable (TypeError); not bypassed |
| [Cerebras](https://www.cerebras.ai/blog) | 200 | 0 | Response exceeds 2000000 bytes |
| [BentoML](https://www.bentoml.com/blog) | 200 | 0 | Response exceeds 2000000 bytes |
| [Evidently AI](https://www.evidentlyai.com/blog) | 200 | 0 | No advertised feed found on this public page |
| [Visual Studio Code](https://code.visualstudio.com/blogs/) | 200 | 1 |  |
| [MLflow](https://mlflow.org/blog) | 200 | 2 |  |
| [Dataiku](https://blog.dataiku.com/) | 200 | 0 | No advertised feed found on this public page |
| [Pinecone](https://www.pinecone.io/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Weaviate](https://weaviate.io/blog) | 200 | 2 |  |
| [ClearML](https://clear.ml/blog/) | 200 | 1 |  |
| [Qdrant](https://qdrant.tech/blog/) | 200 | 1 |  |
| [Arize AI](https://arize.com/blog/) | 200 | 2 |  |
| [Databricks](https://www.databricks.com/blog) | 200 | 1 |  |
| [Zilliz](https://zilliz.com/blog) | 200 | 0 | No advertised feed found on this public page |
| [Snowflake](https://www.snowflake.com/en/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Chroma](https://www.trychroma.com/blog) | 200 | 0 | No advertised feed found on this public page |
| [GitHub](https://github.blog/) | 200 | 1 |  |
| [Confluent](https://www.confluent.io/blog/) | 200 | 1 |  |
| [GitLab](https://about.gitlab.com/blog/) | 200 | 2 |  |
| [Docker](https://www.docker.com/blog/) | 200 | 2 |  |
| [Cloudflare](https://blog.cloudflare.com/) | 200 | 1 |  |
| [Replit](https://blog.replit.com/) | — | 0 | robots.txt unavailable (525); not bypassed |
| [Redis](https://redis.io/blog/) | 200 | 0 | No advertised feed found on this public page |
| [Vercel](https://vercel.com/blog) | 200 | 1 |  |
| [Kubernetes](https://kubernetes.io/blog/) | 200 | 1 |  |
| [Netlify](https://www.netlify.com/blog/) | 200 | 2 |  |
| [Cursor](https://cursor.com/blog) | 200 | 0 | No advertised feed found on this public page |
| [Continue](https://blog.continue.dev/) | 200 | 0 | No advertised feed found on this public page |
| [Google Research](https://research.google/blog/) | 200 | 1 |  |
| [Sourcegraph](https://sourcegraph.com/blog) | 200 | 1 |  |
| [Amazon Science](https://www.amazon.science/blog) | 200 | 1 |  |
| [Tabnine](https://www.tabnine.com/blog/) | — | 0 | robots.txt unavailable (502); not bypassed |
| [Windsurf](https://windsurf.com/blog) | 200 | 1 |  |
| [Apple Machine Learning Research](https://machinelearning.apple.com/) | 200 | 1 |  |
| [Milvus](https://milvus.io/blog) | — | 0 | TypeError: fetch failed |
| [Stanford CRFM](https://crfm.stanford.edu/blog.html) | 200 | 0 | No advertised feed found on this public page |
| [Salesforce AI Research](https://www.salesforce.com/blog/category/ai-research/) | 200 | 2 |  |
| [Microsoft Research](https://www.microsoft.com/en-us/research/blog/) | 200 | 1 |  |
| [MIT AI News](https://news.mit.edu/topic/artificial-intelligence2) | 200 | 2 |  |
| [MIT CSAIL](https://www.csail.mit.edu/news) | 200 | 0 | No advertised feed found on this public page |
| [Berkeley AI Research](https://bair.berkeley.edu/blog/) | 200 | 1 |  |
| [LAION](https://laion.ai/blog/) | 200 | 0 | No advertised feed found on this public page |
| [EleutherAI](https://www.eleuther.ai/blog) | 404 | 0 | HTTP 404 |
| [Oxford Machine Learning](https://www.robots.ox.ac.uk/~parg/) | — | 0 | robots.txt disallows this path; not bypassed |
| [Stanford AI Lab](https://ai.stanford.edu/blog/) | 200 | 1 |  |
| [Allen Institute for AI](https://allenai.org/blog) | 200 | 1 |  |
| [CMU Machine Learning](https://blog.ml.cmu.edu/) | 200 | 1 |  |
