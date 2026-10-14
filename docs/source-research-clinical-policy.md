# Clinical, policy and university source research

Generated 2026-10-14T20:40:22.549Z.

142 distinct endpoints tested: 116 returned a usable titled RSS/Atom/RDF feed; 26 retained disabled with failure evidence. 71 feeds contained an AI keyword match and 22 contained one within the strict preceding 24 hours. This is a source-health inventory, not a claim that every feed has fresh AI news. Mixed feeds require AI filtering; journal studies are not medical advice. No preprint servers are included.

## Discovery and trust

Official publisher directories and journal homepages are the discovery authority. [JAMA's RSS directory](https://jamanetwork.com/pages/rss/) supplies exact journal ids and both Current Issue and Online First routes. [BMJ's reader guidance](https://www.bmj.com/about-bmj/resources-readers) and [BMJ's feed documentation](https://stg-blogs.bmj.com/bmj-journals-development-blog/category/rss-feeds/) describe journal RSS pages, feed types and their [published OPML](https://group.bmj.com/group/subscriptions-and-sales/institutional-support-services/bmjrssfeeds.opml). [Nature Medicine's RSS guidance](https://www.nature.com/nm/web-feeds) and journal homepages expose current publisher feed routes. [PLOS's official reading guidance](https://journals.plos.org/plosone/s/find-and-read-articles) documents journal-homepage RSS discovery. [NIST's official directory](https://www.nist.gov/coo/nist-rss-feeds) and [MIT's official directory](https://news.mit.edu/rss) supply topic-specific links. GOV.UK organization pages publish Atom routes. Additional institutions were checked through their published RSS routes and official HTML; discovery-page linkage is recorded independently for every candidate. Each candidate records its discoveryUrl, publisher, kind and trustReason.

Current Issue and Online First are distinct published endpoints with different release windows; they should be deduplicated by canonical article URL during aggregation. Subject feeds may overlap journal feeds. Publisher identity is not a guarantee of an individual study's quality. Government and policy feeds are first-party statements and may convey institutional positions.

## Method and limits

The reproducible command is node scripts/catalog-clinical-policy.mjs. It performs public GET requests with an honest audit user agent, at most eight workers, an eight-second timeout per request and a two-megabyte body limit. It checks robots directives, respects matching Disallow rules, and does not log in, evade blocks or scrape subscriber articles. HTTP status, content type, redirects, XML validity, titled entries, publication timestamps, AI keyword matches and strict 24-hour AI counts are retained in the JSON. Future and missing dates do not qualify as fresh. The keyword screen is deliberately conservative and differs from final editorial filtering. The audit measures this execution host and time; an HTTP failure can be temporary or environment-specific.

An enabled candidate means its feed parsed at audit time. It does not mean it was deployed, polled in production, or contained fresh AI stories. Failed endpoints are not silently replaced. Official discovery-page linkage is recorded separately; an inaccessible directory is not treated as proof that a documented feed route has disappeared. Re-test before activation and poll feeds with a staggered cached backend, not all on every client refresh.

## Results

| Feed | Audit outcome | HTTP | Titled entries | AI matches | Fresh AI (24h) | Latest publication | Error |
|---|---|---:|---:|---:|---:|---|---|
| Nature | Feed parsed | 200 | 75 | 6 | 3 | 2026-10-14T00:00:00.000Z | — |
| Nature Medicine | Feed parsed | 200 | 8 | 2 | 1 | 2026-10-14T00:00:00.000Z | — |
| Nature Biotechnology | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-13T00:00:00.000Z | — |
| Nature Methods | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature Neuroscience | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| Nature Reviews Genetics | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-12T00:00:00.000Z | — |
| Nature Genetics | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| Nature Reviews Drug Discovery | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| Nature Reviews Clinical Oncology | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature Communications | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| Scientific Reports | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| npj Digital Medicine | Feed parsed | 200 | 8 | 4 | 4 | 2026-10-14T00:00:00.000Z | — |
| Nature Machine Intelligence | Feed parsed | 200 | 8 | 8 | 0 | 2026-10-13T00:00:00.000Z | — |
| Nature Biomedical Engineering | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature Computational Science | Feed parsed | 200 | 8 | 5 | 0 | 2026-10-14T00:00:00.000Z | — |
| Nature Human Behaviour | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature Mental Health | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature Cancer | Feed parsed | 200 | 8 | 1 | 0 | 2026-10-14T00:00:00.000Z | — |
| npj Precision Oncology | Feed parsed | 200 | 8 | 2 | 2 | 2026-10-14T00:00:00.000Z | — |
| npj Genomic Medicine | Feed parsed | 200 | 8 | 0 | 0 | 2026-10-05T00:00:00.000Z | — |
| Nature subject artificial intelligence | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature subject machine learning | Feed parsed | 200 | 30 | 30 | 2 | 2026-10-14T00:00:00.000Z | — |
| Nature subject medical imaging | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature subject biomedical engineering | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature subject drug discovery | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Nature subject computational biology and bioinformatics | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| BMJ Open | Feed parsed | 200 | 162 | 9 | 0 | 2026-10-13T09:42:55.000Z | — |
| BMJ Health and Care Informatics | Feed parsed | 200 | 94 | 47 | 0 | 2026-10-13T09:52:27.000Z | — |
| BMJ Digital Health and AI | Feed parsed | 200 | 69 | 50 | 0 | 2026-10-07T13:31:48.000Z | — |
| BMJ Innovations | Feed parsed | 200 | 11 | 3 | 0 | 2026-09-30T07:45:24.000Z | — |
| BMJ Global Health | Feed parsed | 200 | 14 | 0 | 0 | 2026-10-14T11:13:48.000Z | — |
| BMJ Quality and Safety | Feed parsed | 200 | 8 | 1 | 0 | 2026-09-21T09:25:12.000Z | — |
| Gut | Feed parsed | 200 | 31 | 0 | 0 | 2026-10-07T07:56:58.000Z | — |
| Heart | Feed parsed | 200 | 10 | 0 | 0 | 2026-10-09T08:05:25.000Z | — |
| Journal of Neurology Neurosurgery and Psychiatry | Feed parsed | 200 | 12 | 0 | 0 | 2026-10-13T14:08:17.000Z | — |
| British Journal of Ophthalmology | Feed parsed | 200 | 19 | 1 | 0 | 2026-09-22T07:45:39.000Z | — |
| Thorax | Feed parsed | 200 | 18 | 1 | 0 | 2026-09-15T15:18:20.000Z | — |
| Annals of the Rheumatic Diseases | Feed parsed | 200 | 24 | 1 | 0 | 2024-11-14T16:45:48.000Z | — |
| Archives of Disease in Childhood | Feed parsed | 200 | 26 | 0 | 0 | 2026-09-18T07:45:34.000Z | — |
| Emergency Medicine Journal | Feed parsed | 200 | 16 | 1 | 0 | 2026-09-18T07:45:26.000Z | — |
| Journal of Clinical Pathology | Feed parsed | 200 | 10 | 2 | 0 | 2026-09-18T07:45:27.000Z | — |
| Journal of Medical Genetics | Feed parsed | 200 | 10 | 0 | 0 | 2026-09-29T08:52:31.000Z | — |
| Journal of Medical Ethics | Feed parsed | 200 | 14 | 1 | 0 | 2026-09-22T07:45:23.000Z | — |
| Journal of Epidemiology and Community Health | Feed parsed | 200 | 15 | 0 | 0 | 2026-10-09T07:45:28.000Z | — |
| BMJ Open Respiratory Research | Feed parsed | 200 | 212 | 7 | 0 | 2026-10-12T16:10:47.000Z | — |
| BMJ Open Diabetes Research and Care | Feed parsed | 200 | 15 | 0 | 0 | 2026-10-13T09:50:03.000Z | — |
| Open Heart | Feed parsed | 200 | 73 | 8 | 0 | 2026-10-12T16:16:52.000Z | — |
| BMJ Open Gastroenterology | Feed parsed | 200 | 60 | 1 | 0 | 2026-10-09T12:04:12.000Z | — |
| BMJ Neurology Open | Feed parsed | 200 | 42 | 1 | 0 | 2026-10-14T11:14:44.000Z | — |
| BMJ Mental Health | Feed parsed | 200 | 102 | 9 | 0 | 2026-10-13T09:53:00.000Z | — |
| Trauma Surgery and Acute Care Open | Feed parsed | 200 | 65 | 3 | 0 | 2026-09-29T13:36:41.000Z | — |
| The BMJ latest articles | Feed parsed | 200 | 6 | 1 | 1 | 2026-10-14T11:36:25.000Z | — |
| JAMA Online First | Feed parsed | 200 | 7 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| JAMA Current Issue | Feed parsed | 200 | 41 | 0 | 0 | 2026-10-13T00:00:00.000Z | — |
| JAMA Cardiology Online First | Feed parsed | 200 | 9 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| JAMA Cardiology Current Issue | Feed parsed | 200 | 30 | 5 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Dermatology Online First | Feed parsed | 200 | 13 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| JAMA Dermatology Current Issue | Feed parsed | 200 | 22 | 0 | 0 | 2026-09-01T00:00:00.000Z | — |
| JAMA Internal Medicine Online First | Feed parsed | 200 | 16 | 0 | 0 | 2026-10-12T00:00:00.000Z | — |
| JAMA Internal Medicine Current Issue | Feed parsed | 200 | 30 | 2 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Neurology Online First | Feed parsed | 200 | 9 | 0 | 0 | 2026-10-12T00:00:00.000Z | — |
| JAMA Neurology Current Issue | Feed parsed | 200 | 22 | 0 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Oncology Online First | Feed parsed | 200 | 9 | 0 | 0 | 2026-10-08T00:00:00.000Z | — |
| JAMA Oncology Current Issue | Feed parsed | 200 | 34 | 0 | 0 | 2026-09-01T00:00:00.000Z | — |
| JAMA Ophthalmology Online First | Feed parsed | 200 | 11 | 0 | 0 | 2026-10-08T00:00:00.000Z | — |
| JAMA Ophthalmology Current Issue | Feed parsed | 200 | 26 | 2 | 0 | 2026-09-01T00:00:00.000Z | — |
| JAMA Otolaryngology Head and Neck Surgery Online First | Feed parsed | 200 | 11 | 0 | 0 | 2026-10-08T00:00:00.000Z | — |
| JAMA Otolaryngology Head and Neck Surgery Current Issue | Feed parsed | 200 | 24 | 0 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Pediatrics Online First | Feed parsed | 200 | 10 | 0 | 0 | 2026-10-12T00:00:00.000Z | — |
| JAMA Pediatrics Current Issue | Feed parsed | 200 | 42 | 0 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Psychiatry Online First | Feed parsed | 200 | 9 | 2 | 1 | 2026-10-14T00:00:00.000Z | — |
| JAMA Psychiatry Current Issue | Feed parsed | 200 | 20 | 1 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Surgery Online First | Feed parsed | 200 | 11 | 0 | 0 | 2026-10-14T00:00:00.000Z | — |
| JAMA Surgery Current Issue | Feed parsed | 200 | 30 | 2 | 0 | 2026-10-01T00:00:00.000Z | — |
| JAMA Network Open | Feed parsed | 200 | 104 | 1 | 1 | 2026-10-14T00:00:00.000Z | — |
| JAMA Health Forum | Feed parsed | 200 | 16 | 2 | 0 | 2026-10-09T00:00:00.000Z | — |
| PLOS One | Feed parsed | 200 | 30 | 2 | 2 | 2026-10-14T14:00:00.000Z | — |
| PLOS Medicine | Feed parsed | 200 | 30 | 4 | 0 | 2026-10-13T14:00:00.000Z | — |
| PLOS Computational Biology | Feed parsed | 200 | 30 | 8 | 0 | 2026-10-14T14:00:00.000Z | — |
| PLOS Biology | Feed parsed | 200 | 30 | 0 | 0 | 2026-10-14T14:00:00.000Z | — |
| PLOS Genetics | Feed parsed | 200 | 30 | 1 | 0 | 2026-10-14T14:00:00.000Z | — |
| PLOS Digital Health | Feed parsed | 200 | 30 | 15 | 2 | 2026-10-14T14:00:00.000Z | — |
| PLOS Global Public Health | Feed parsed | 200 | 30 | 1 | 0 | 2026-10-14T14:00:00.000Z | — |
| Journal of Medical Internet Research | Feed parsed | 200 | 10 | 3 | 1 | 2026-10-14T15:30:23.000Z | — |
| JMIR AI | Feed parsed | 200 | 10 | 10 | 0 | 2026-10-13T15:00:07.000Z | — |
| JMIR Medical Informatics | Feed parsed | 200 | 10 | 7 | 1 | 2026-10-13T21:00:21.000Z | — |
| JMIR mHealth and uHealth | Feed parsed | 200 | 10 | 1 | 0 | 2026-10-13T19:15:19.000Z | — |
| JMIR Human Factors | Feed parsed | 200 | 10 | 2 | 0 | 2026-10-13T19:15:19.000Z | — |
| JMIR Mental Health | Feed parsed | 200 | 10 | 6 | 0 | 2026-10-09T21:30:26.000Z | — |
| JMIR Formative Research | Feed parsed | 200 | 10 | 2 | 0 | 2026-10-14T15:30:23.000Z | — |
| JMIR Cancer | Feed parsed | 200 | 10 | 6 | 1 | 2026-10-13T21:15:19.000Z | — |
| JMIR Aging | Feed parsed | 200 | 10 | 1 | 0 | 2026-10-13T21:15:19.000Z | — |
| JMIR Public Health and Surveillance | Feed parsed | 200 | 10 | 0 | 0 | 2026-10-13T16:30:22.000Z | — |
| NIST News | Feed parsed | 200 | 40 | 5 | 0 | 2026-10-08T12:00:00.000Z | — |
| NIST Health | Feed parsed | 200 | 40 | 0 | 0 | 2026-09-24T13:00:00.000Z | — |
| NIST Information Technology | Feed parsed | 200 | 40 | 5 | 0 | 2027-01-26T05:00:00.000Z | — |
| NIST Cybersecurity | Disabled | 200 | 0 | 0 | 0 | — | feed contains no titled entries |
| NIST Standards | Feed parsed | 200 | 40 | 5 | 0 | 2026-11-03T05:00:00.000Z | — |
| NIST Cybersecurity Insights | Feed parsed | 200 | 40 | 5 | 0 | 2026-10-14T12:00:00.000Z | — |
| UK Department for Science Innovation and Technology | Feed parsed | 200 | 20 | 1 | 0 | 2026-10-13T15:00:38.000Z | — |
| UK Competition and Markets Authority | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-14T10:00:45.000Z | — |
| UK Medicines and Healthcare products Regulatory Agency | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-14T15:55:14.000Z | — |
| UK Department of Health and Social Care | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-14T15:37:18.000Z | — |
| UK Foreign Commonwealth and Development Office | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-14T19:09:22.000Z | — |
| UK Department for Business and Trade | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-14T13:59:59.000Z | — |
| FDA Press Releases | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-05T13:02:06.000Z | — |
| FDA MedWatch Medical Product Safety | Feed parsed | 200 | 20 | 0 | 0 | 2026-10-14T04:00:00.000Z | — |
| NIH Technology Transfer | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Healthcare IT News | Disabled | 403 | 0 | 0 | 0 | — | HTTP 403 |
| MobiHealthNews | Disabled | 403 | 0 | 0 | 0 | — | HTTP 403 |
| Healthcare Dive | Feed parsed | 200 | 10 | 1 | 0 | 2026-10-14T19:40:27.000Z | — |
| MedTech Dive | Feed parsed | 200 | 10 | 0 | 0 | 2026-10-14T14:53:19.000Z | — |
| Fierce Healthcare | Disabled | 200 | 0 | 0 | 0 | — | feed contains no titled entries |
| MedCity News | Feed parsed | 200 | 30 | 4 | 2 | 2026-10-14T16:52:15.000Z | — |
| STAT Health and Medicine | Feed parsed | 200 | 20 | 2 | 2 | 2026-10-14T20:16:59.000Z | — |
| STAT Artificial Intelligence | Feed parsed | 200 | 20 | 15 | 2 | 2026-10-14T13:17:57.000Z | — |
| HIT Consultant | Feed parsed | 200 | 15 | 4 | 1 | 2026-10-14T14:37:47.000Z | — |
| HealthTech Magazine | Feed parsed | 200 | 10 | 3 | 0 | 2026-10-13T18:52:32.000Z | — |
| NIH News Releases | Disabled | 403 | 0 | 0 | 0 | — | HTTP 403 |
| NIH Directors Blog | Disabled | — | 0 | 0 | 0 | — | fetch failed |
| ASTP ONC Health IT Buzz | Feed parsed | 200 | 10 | 5 | 0 | 2026-09-30T15:50:09.000Z | — |
| FTC Press Releases | Feed parsed | 200 | 10 | 0 | 0 | 2026-10-13T12:00:00.000Z | — |
| WHO News | Disabled | — | 0 | 0 | 0 | — | robots disallows /; feed not requested |
| UN News | Disabled | — | 0 | 0 | 0 | — | robots disallows */news/; feed not requested |
| European Parliament Top Stories | Disabled | 202 | 0 | 0 | 0 | — | response is not well-formed XML |
| European Parliament Press Room | Disabled | 202 | 0 | 0 | 0 | — | response is not well-formed XML |
| Brookings | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Georgetown CSET | Feed parsed | 200 | 10 | 8 | 0 | 2026-10-06T13:57:20.000Z | — |
| Lawfare | Disabled | 403 | 0 | 0 | 0 | — | HTTP 403 |
| MIT Research News | Feed parsed | 200 | 50 | 22 | 2 | 2026-10-14T15:00:00.000Z | — |
| MIT Health Sciences and Technology | Feed parsed | 200 | 27 | 9 | 1 | 2026-10-13T21:00:00.000Z | — |
| MIT Neuroscience | Feed parsed | 200 | 31 | 16 | 1 | 2026-10-13T21:00:00.000Z | — |
| MIT Robotics | Feed parsed | 200 | 50 | 31 | 0 | 2026-10-07T04:00:00.000Z | — |
| MIT Artificial Intelligence | Feed parsed | 200 | 50 | 50 | 2 | 2026-10-14T15:00:00.000Z | — |
| MIT Political Science | Feed parsed | 200 | 29 | 11 | 0 | 2026-10-12T12:00:00.000Z | — |
| Berkeley AI Research Blog | Feed parsed | 200 | 10 | 10 | 0 | 2026-07-29T09:00:00.000Z | — |
| Carnegie Mellon Machine Learning Blog | Feed parsed | 200 | 1 | 1 | 0 | 2026-08-10T21:52:23.000Z | — |
| Stanford Medicine Scope | Disabled | 200 | 0 | 0 | 0 | — | response is not well-formed XML |
| Harvard Gazette Science and Technology | Feed parsed | 200 | 50 | 24 | 2 | 2026-10-14T20:24:37.000Z | — |
| Cambridge Research News | Feed parsed | 200 | 10 | 0 | 0 | 2026-10-13T13:22:53.000Z | — |
| Oxford News | Disabled | 403 | 0 | 0 | 0 | — | HTTP 403 |
| UCL News | Disabled | 403 | 0 | 0 | 0 | — | HTTP 403 |

## Discovery pages without a selected feed

- [European Digital Strategy](https://digital-strategy.ec.europa.eu/en/news): No eligible public RSS/Atom link found; no URL invented.
- [Council of the European Union](https://www.consilium.europa.eu/en/press/press-releases/): HTTP 403
- [European Data Protection Supervisor](https://www.edps.europa.eu/press-publications/press-news_en): HTTP 403
- [US National Science Foundation](https://www.nsf.gov/news/): No eligible public RSS/Atom link found; no URL invented.
- [CSIS Analysis](https://www.csis.org/analysis): No eligible public RSS/Atom link found; no URL invented.
- [RAND Artificial Intelligence](https://www.rand.org/topics/artificial-intelligence.html): HTTP 403
- [Yale News](https://news.yale.edu/): No eligible public RSS/Atom link found; no URL invented.
- [University of Pennsylvania AI](https://ai.upenn.edu/news/): No eligible public RSS/Atom link found; no URL invented.
- [Johns Hopkins Hub](https://hub.jhu.edu/): HTTP 403
- [UC Berkeley News](https://news.berkeley.edu/): No eligible public RSS/Atom link found; no URL invented.
- [UC San Diego Today](https://today.ucsd.edu/): No eligible public RSS/Atom link found; no URL invented.
- [Imperial College News](https://www.imperial.ac.uk/news/): No eligible public RSS/Atom link found; no URL invented.
- [ETH Zurich News](https://ethz.ch/en/news-and-events/eth-news.html): No eligible public RSS/Atom link found; no URL invented.
- [EPFL News](https://actu.epfl.ch/): No eligible public RSS/Atom link found; no URL invented.
- [University of Toronto News](https://www.utoronto.ca/news): No eligible public RSS/Atom link found; no URL invented.
