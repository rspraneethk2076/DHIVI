# Dhivi source audit

335 distinct endpoints screened; **200 active feeds across 85 publisher groups**. Checked 2026-10-14T20:57:19.107Z. Counts distinguish feeds from publishers. Multiple sections from one publisher are grouped when balancing the live feed.

Only HTTP/XML-validated, nonduplicate publisher feeds enter the registry. Failed, blocked, robots-excluded and alias endpoints remain in the JSON audit. Mixed feeds require AI relevance filtering. Journal issue feeds without a reliable original publication date are excluded. Current news must still have its own publisher publication date within the past 24 hours; a working feed may contain no qualifying stories today.

Reproduce with the catalog scripts, then **npm run sources:build**. The full evidence is in [the JSON audit](../public/source-audit.json) and the source-candidate files under data/.

| Source | Publisher | Type | Feed |
|---|---|---|---|
| OpenAI | OpenAI | official | [RSS/Atom](https://openai.com/news/rss.xml) |
| Google AI | Google | official | [RSS/Atom](https://blog.google/technology/ai/rss/) |
| Google Research | Google | research | [RSS/Atom](https://research.google/blog/rss/) |
| Hugging Face | Hugging Face | official | [RSS/Atom](https://huggingface.co/blog/feed.xml) |
| NVIDIA | NVIDIA | official | [RSS/Atom](https://blogs.nvidia.com/blog/category/generative-ai/feed/) |
| MIT News | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/rss/topic/artificial-intelligence2) |
| TechCrunch | TechCrunch | publisher | [RSS/Atom](https://techcrunch.com/category/artificial-intelligence/feed/) |
| MarkTechPost | MarkTechPost | publisher | [RSS/Atom](https://www.marktechpost.com/feed/) |
| Ars Technica — All News | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/index) |
| Ars Technica — Ars Features | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/features) |
| Ars Technica — Technology Lab | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/technology-lab) |
| Ars Technica — Gear & Gadgets | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/gadgets) |
| Ars Technica — Law & Disorder | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/tech-policy) |
| Ars Technica — Infinite Loop | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/apple) |
| Ars Technica — The Scientific Method | Ars Technica | publisher | [RSS/Atom](https://feeds.arstechnica.com/arstechnica/science) |
| WIRED | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/rss) |
| WIRED — Business | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/category/business/latest/rss) |
| WIRED — Artificial Intelligence | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/tag/ai/latest/rss) |
| WIRED — Gear | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/category/gear/latest/rss) |
| WIRED — Ideas | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/category/ideas/latest/rss) |
| WIRED — Science | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/category/science/latest/rss) |
| WIRED — Security | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/category/security/latest/rss) |
| WIRED — Backchannel | WIRED | publisher | [RSS/Atom](https://www.wired.com/feed/category/backchannel/latest/rss) |
| TechCrunch AI | TechCrunch | publisher | [RSS/Atom](https://techcrunch.com/feed/) |
| The Verge AI — The Verge | The Verge | publisher | [RSS/Atom](https://www.theverge.com/rss/index.xml) |
| The Verge AI — AI | The Verge | publisher | [RSS/Atom](https://www.theverge.com/rss/ai-artificial-intelligence/index.xml) |
| Engadget — News - Engadget | Engadget | publisher | [RSS/Atom](https://www.engadget.com/category/news/feed/) |
| Engadget | Engadget | publisher | [RSS/Atom](https://www.engadget.com/feed/) |
| The New Stack | The New Stack | publisher | [RSS/Atom](https://thenewstack.io/blog/feed/) |
| SD Times | SD Times | publisher | [RSS/Atom](https://sdtimes.com/feed/) |
| Unite.AI — Unite.AI — RSS | Unite.AI | publisher | [RSS/Atom](https://www.unite.ai/feed/) |
| Machine Learning Mastery | Machine Learning Mastery | publisher | [RSS/Atom](https://feeds.feedburner.com/MachineLearningMastery) |
| IEEE Spectrum — IEEE Spectrum | IEEE Spectrum | publisher | [RSS/Atom](https://spectrum.ieee.org/feeds/feed.rss) |
| IEEE Spectrum | IEEE Spectrum | publisher | [RSS/Atom](https://spectrum.ieee.org/customfeeds/feed/all-topics/rss) |
| CNET | CNET | publisher | [RSS/Atom](https://www.cnet.com/rss/all/) |
| MIT News | Massachusetts Institute of Technology | research | [RSS/Atom](https://www.technologyreview.com/feed/) |
| Google — The Keyword | Google | official | [RSS/Atom](https://blog.google/rss/) |
| Microsoft | Microsoft | official | [RSS/Atom](https://blogs.microsoft.com/feed/) |
| Microsoft AI | Microsoft | official | [RSS/Atom](https://news.microsoft.com/source/feed/) |
| Microsoft AI | Microsoft | official | [RSS/Atom](https://news.microsoft.com/source/topics/ai/feed/) |
| Microsoft Azure | Microsoft | official | [RSS/Atom](https://azure.microsoft.com/en-us/blog/feed/) |
| Microsoft 365 | Microsoft | official | [RSS/Atom](https://www.microsoft.com/en-us/copilot/blog/feed/) |
| Microsoft Agent Framework | Microsoft | official | [RSS/Atom](https://devblogs.microsoft.com/agent-framework/feed/) |
| Microsoft Foundry | Microsoft | official | [RSS/Atom](https://devblogs.microsoft.com/foundry/feed/) |
| Microsoft .NET | Microsoft | official | [RSS/Atom](https://devblogs.microsoft.com/dotnet/feed/) |
| Visual Studio | Microsoft | official | [RSS/Atom](https://devblogs.microsoft.com/visualstudio/feed/) |
| Visual Studio Code | Microsoft | official | [RSS/Atom](https://code.visualstudio.com/feed.xml) |
| Windows Developer — Subscribe to RSS | Microsoft | official | [RSS/Atom](https://blogs.windows.com/windowsdeveloper/feed) |
| AWS News | Amazon | official | [RSS/Atom](https://aws.amazon.com/blogs/aws/feed/) |
| AWS AI | Amazon | official | [RSS/Atom](https://aws.amazon.com/blogs/machine-learning/feed/) |
| AWS Big Data | Amazon | official | [RSS/Atom](https://aws.amazon.com/blogs/big-data/feed/) |
| AWS Compute | Amazon | official | [RSS/Atom](https://aws.amazon.com/blogs/compute/feed/) |
| AWS Architecture | Amazon | official | [RSS/Atom](https://aws.amazon.com/blogs/architecture/feed/) |
| AWS Open Source | Amazon | official | [RSS/Atom](https://aws.amazon.com/blogs/opensource/feed/) |
| NVIDIA Generative AI | NVIDIA | official | [RSS/Atom](https://blogs.nvidia.com/feed/) |
| Meta Engineering | Meta | official | [RSS/Atom](https://engineering.fb.com/feed/) |
| Oracle AI — Oracle Blogs | Oracle | official | [RSS/Atom](https://blogs.oracle.com/rss) |
| Oracle AI | Oracle | official | [RSS/Atom](https://blogs.oracle.com/ai-and-datascience/feed) |
| Mistral AI — Mistral | Mistral | official | [RSS/Atom](https://mistral.ai/news/rss) |
| ElevenLabs | ElevenLabs | official | [RSS/Atom](https://elevenlabs.io/blog/rss.xml) |
| Ollama — Ollama Blog RSS | Ollama | official | [RSS/Atom](https://ollama.com/blog/rss.xml) |
| vLLM | vLLM | official | [RSS/Atom](https://vllm.ai/blog/rss.xml) |
| Modal | Modal | official | [RSS/Atom](https://modal.com/blog/atom.xml) |
| Replicate | Replicate | official | [RSS/Atom](https://replicate.com/blog/rss) |
| Together AI — Together AI Blog | Together AI | official | [RSS/Atom](https://www.together.ai/blog/rss.xml) |
| SambaNova | SambaNova | official | [RSS/Atom](https://sambanova.ai/blog/rss.xml) |
| Anaconda | Anaconda | official | [RSS/Atom](https://www.anaconda.com/feed) |
| DataRobot | DataRobot | official | [RSS/Atom](https://www.datarobot.com/blog/feed/) |
| ClearML | ClearML | official | [RSS/Atom](https://clear.ml/feed) |
| MLflow | MLflow | official | [RSS/Atom](https://mlflow.org/blog/rss.xml) |
| Arize AI | Arize | official | [RSS/Atom](https://arize.com/feed/) |
| Arize AI | Arize | official | [RSS/Atom](https://arize.com/web-stories/feed/) |
| Databricks | Databricks | official | [RSS/Atom](https://www.databricks.com/feed) |
| Confluent | Confluent | official | [RSS/Atom](https://www.confluent.io/rss.xml) |
| GitLab | GitLab | official | [RSS/Atom](https://about.gitlab.com/atom.xml) |
| Docker | Docker | official | [RSS/Atom](https://www.docker.com/feed/) |
| Kubernetes — Kubernetes | Kubernetes | official | [RSS/Atom](https://kubernetes.io/feed.xml) |
| Cloudflare — Cloudflare Blog | Cloudflare | official | [RSS/Atom](https://blog.cloudflare.com/rss/) |
| Netlify — Netlify Blog | Netlify | official | [RSS/Atom](https://www.netlify.com/feed.xml) |
| Netlify — Netlify Changelog | Netlify | official | [RSS/Atom](https://www.netlify.com/changelog/feed.xml) |
| Devin Blog | Cognition | official | [RSS/Atom](https://devin.ai/rss.xml) |
| Sourcegraph — Sourcegraph Blog | Sourcegraph | official | [RSS/Atom](https://sourcegraph.com/blog/feed.rss) |
| Microsoft Research | Microsoft | research | [RSS/Atom](https://www.microsoft.com/en-us/research/feed/) |
| Apple Machine Learning Research | Apple | research | [RSS/Atom](https://machinelearning.apple.com/rss.xml) |
| Amazon Science | Amazon | research | [RSS/Atom](https://www.amazon.science/index.rss) |
| Salesforce Blog | Salesforce | official | [RSS/Atom](https://www.salesforce.com/blog/feed/) |
| Salesforce AI Research | Salesforce | research | [RSS/Atom](https://www.salesforce.com/blog/category/ai-research/feed/) |
| Stanford AI Lab — The Stanford AI Lab Blog | Stanford University | research | [RSS/Atom](https://ai.stanford.edu/blog/feed.xml) |
| Allen Institute for AI — Ai2 RSS Feeds | Allen Institute for AI | research | [RSS/Atom](https://allenai.org/rss.xml) |
| TechRadar | TechRadar | publisher | [RSS/Atom](https://www.techradar.com/feeds.xml) |
| TechRadar | TechRadar | publisher | [RSS/Atom](https://www.techradar.com/feeds/articletype/how-to) |
| Tom’s Hardware | Tom’s Hardware | publisher | [RSS/Atom](https://www.tomshardware.com/feeds.xml) |
| Stability AI | Stability AI | official | [RSS/Atom](https://stability.ai/news-updates?format=rss) |
| Qdrant — Qdrant - Vector Search Engine | Qdrant | official | [RSS/Atom](https://qdrant.tech/blog/index.xml) |
| Nature | Springer Nature | publisher | [RSS/Atom](https://www.nature.com/nature.rss) |
| Nature Medicine | Springer Nature | journal | [RSS/Atom](https://www.nature.com/nm.rss) |
| Nature Biotechnology | Springer Nature | journal | [RSS/Atom](https://www.nature.com/nbt.rss) |
| Nature Neuroscience | Springer Nature | journal | [RSS/Atom](https://www.nature.com/neuro.rss) |
| Nature Reviews Genetics | Springer Nature | journal | [RSS/Atom](https://www.nature.com/nrg.rss) |
| Nature Genetics | Springer Nature | journal | [RSS/Atom](https://www.nature.com/ng.rss) |
| Nature Reviews Drug Discovery | Springer Nature | journal | [RSS/Atom](https://www.nature.com/nrd.rss) |
| Nature Communications | Springer Nature | journal | [RSS/Atom](https://www.nature.com/ncomms.rss) |
| Scientific Reports | Springer Nature | journal | [RSS/Atom](https://www.nature.com/srep.rss) |
| npj Digital Medicine | Springer Nature | journal | [RSS/Atom](https://www.nature.com/npjdigitalmed.rss) |
| Nature Machine Intelligence | Springer Nature | journal | [RSS/Atom](https://www.nature.com/natmachintell.rss) |
| Nature Computational Science | Springer Nature | journal | [RSS/Atom](https://www.nature.com/natcomputsci.rss) |
| Nature Cancer | Springer Nature | journal | [RSS/Atom](https://www.nature.com/natcancer.rss) |
| npj Precision Oncology | Springer Nature | journal | [RSS/Atom](https://www.nature.com/npjprecisiononcology.rss) |
| npj Genomic Medicine | Springer Nature | journal | [RSS/Atom](https://www.nature.com/npjgenmed.rss) |
| Nature subject machine learning | Springer Nature | journal | [RSS/Atom](https://www.nature.com/subjects/machine-learning.rss) |
| BMJ Open | BMJ Group | journal | [RSS/Atom](https://bmjopen.bmj.com/rss/current.xml) |
| BMJ Health and Care Informatics | BMJ Group | journal | [RSS/Atom](https://informatics.bmj.com/rss/current.xml) |
| BMJ Digital Health and AI | BMJ Group | journal | [RSS/Atom](https://bmjdigitalhealth.bmj.com/rss/current.xml) |
| BMJ Global Health | BMJ Group | journal | [RSS/Atom](https://gh.bmj.com/rss/current.xml) |
| BMJ Open Respiratory Research | BMJ Group | journal | [RSS/Atom](https://bmjopenrespres.bmj.com/rss/current.xml) |
| BMJ Open Diabetes Research and Care | BMJ Group | journal | [RSS/Atom](https://drc.bmj.com/rss/current.xml) |
| Open Heart | BMJ Group | journal | [RSS/Atom](https://openheart.bmj.com/rss/current.xml) |
| BMJ Open Gastroenterology | BMJ Group | journal | [RSS/Atom](https://bmjopengastro.bmj.com/rss/current.xml) |
| BMJ Neurology Open | BMJ Group | journal | [RSS/Atom](https://neurologyopen.bmj.com/rss/current.xml) |
| BMJ Mental Health | BMJ Group | journal | [RSS/Atom](https://mentalhealth.bmj.com/rss/current.xml) |
| Trauma Surgery and Acute Care Open | BMJ Group | journal | [RSS/Atom](https://tsaco.bmj.com/rss/current.xml) |
| The BMJ latest articles | BMJ Group | journal | [RSS/Atom](https://www.bmj.com/rss/recent.xml) |
| JAMA Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_3/onlineFirst_67.xml) |
| JAMA Cardiology Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_192/onlineFirst_184.xml) |
| JAMA Dermatology Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_12/onlineFirst_68.xml) |
| JAMA Internal Medicine Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_15/onlineFirst_71.xml) |
| JAMA Neurology Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_16/onlineFirst_72.xml) |
| JAMA Oncology Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_159/onlineFirst_174.xml) |
| JAMA Ophthalmology Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_17/onlineFirst_73.xml) |
| JAMA Otolaryngology Head and Neck Surgery Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_18/onlineFirst_74.xml) |
| JAMA Pediatrics Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_19/onlineFirst_75.xml) |
| JAMA Psychiatry Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_14/onlineFirst_70.xml) |
| JAMA Surgery Online First | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_20/onlineFirst_76.xml) |
| JAMA Network Open | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_214/187.xml) |
| JAMA Health Forum | American Medical Association | journal | [RSS/Atom](https://jamanetwork.com/rss/site_193/185.xml) |
| PLOS One | PLOS | journal | [RSS/Atom](https://journals.plos.org/plosone/feed/atom) |
| PLOS Medicine | PLOS | journal | [RSS/Atom](https://journals.plos.org/plosmedicine/feed/atom) |
| PLOS Computational Biology | PLOS | journal | [RSS/Atom](https://journals.plos.org/ploscompbiol/feed/atom) |
| PLOS Biology | PLOS | journal | [RSS/Atom](https://journals.plos.org/plosbiology/feed/atom) |
| PLOS Genetics | PLOS | journal | [RSS/Atom](https://journals.plos.org/plosgenetics/feed/atom) |
| PLOS Digital Health | PLOS | journal | [RSS/Atom](https://journals.plos.org/digitalhealth/feed/atom) |
| PLOS Global Public Health | PLOS | journal | [RSS/Atom](https://journals.plos.org/globalpublichealth/feed/atom) |
| Journal of Medical Internet Research | JMIR Publications | journal | [RSS/Atom](https://www.jmir.org/feed/atom) |
| JMIR AI | JMIR Publications | journal | [RSS/Atom](https://ai.jmir.org/feed/atom) |
| JMIR Medical Informatics | JMIR Publications | journal | [RSS/Atom](https://medinform.jmir.org/feed/atom) |
| JMIR mHealth and uHealth | JMIR Publications | journal | [RSS/Atom](https://mhealth.jmir.org/feed/atom) |
| JMIR Human Factors | JMIR Publications | journal | [RSS/Atom](https://humanfactors.jmir.org/feed/atom) |
| JMIR Mental Health | JMIR Publications | journal | [RSS/Atom](https://mental.jmir.org/feed/atom) |
| JMIR Formative Research | JMIR Publications | journal | [RSS/Atom](https://formative.jmir.org/feed/atom) |
| JMIR Cancer | JMIR Publications | journal | [RSS/Atom](https://cancer.jmir.org/feed/atom) |
| JMIR Aging | JMIR Publications | journal | [RSS/Atom](https://aging.jmir.org/feed/atom) |
| JMIR Public Health and Surveillance | JMIR Publications | journal | [RSS/Atom](https://publichealth.jmir.org/feed/atom) |
| NIST News | US National Institute of Standards and Technology | official | [RSS/Atom](https://www.nist.gov/news-events/news/rss.xml) |
| NIST Health | US National Institute of Standards and Technology | official | [RSS/Atom](https://www.nist.gov/news-events/health/rss.xml) |
| NIST Information Technology | US National Institute of Standards and Technology | official | [RSS/Atom](https://www.nist.gov/news-events/information%20technology/rss.xml) |
| NIST Standards | US National Institute of Standards and Technology | official | [RSS/Atom](https://www.nist.gov/news-events/standards/rss.xml) |
| NIST Cybersecurity Insights | US National Institute of Standards and Technology | official | [RSS/Atom](https://www.nist.gov/blogs/cybersecurity-insights/rss.xml) |
| UK Department for Science Innovation and Technology | UK Government | official | [RSS/Atom](https://www.gov.uk/government/organisations/department-for-science-innovation-and-technology.atom) |
| UK Competition and Markets Authority | UK Government | official | [RSS/Atom](https://www.gov.uk/government/organisations/competition-and-markets-authority.atom) |
| UK Medicines and Healthcare products Regulatory Agency | UK Government | official | [RSS/Atom](https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency.atom) |
| UK Department of Health and Social Care | UK Government | official | [RSS/Atom](https://www.gov.uk/government/organisations/department-of-health-and-social-care.atom) |
| UK Foreign Commonwealth and Development Office | UK Government | official | [RSS/Atom](https://www.gov.uk/government/organisations/foreign-commonwealth-development-office.atom) |
| UK Department for Business and Trade | UK Government | official | [RSS/Atom](https://www.gov.uk/government/organisations/department-for-business-and-trade.atom) |
| FDA Press Releases | US Food and Drug Administration | official | [RSS/Atom](https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/press-releases/rss.xml) |
| FDA MedWatch Medical Product Safety | US Food and Drug Administration | official | [RSS/Atom](https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml) |
| Healthcare Dive | Informa TechTarget | publisher | [RSS/Atom](https://www.healthcaredive.com/feeds/news/) |
| MedTech Dive | Informa TechTarget | publisher | [RSS/Atom](https://www.medtechdive.com/feeds/news/) |
| MedCity News | MedCity News | publisher | [RSS/Atom](https://medcitynews.com/feed/) |
| STAT Health and Medicine | STAT News | publisher | [RSS/Atom](https://www.statnews.com/feed/) |
| STAT Artificial Intelligence | STAT News | publisher | [RSS/Atom](https://www.statnews.com/tag/artificial-intelligence/feed/) |
| HIT Consultant | HIT Consultant Media | publisher | [RSS/Atom](https://hitconsultant.net/feed/) |
| HealthTech Magazine | CDW HealthTech | publisher | [RSS/Atom](https://healthtechmagazine.net/rss.xml) |
| ASTP ONC Health IT Buzz | US Department of Health and Human Services | official | [RSS/Atom](https://www.healthit.gov/buzz-blog/feed/) |
| FTC Press Releases | US Federal Trade Commission | official | [RSS/Atom](https://www.ftc.gov/feeds/press-release.xml) |
| Georgetown CSET | Georgetown University Center for Security and Emerging Technology | research | [RSS/Atom](https://cset.georgetown.edu/feed/) |
| MIT Research News | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/rss/research) |
| MIT Health Sciences and Technology | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/rss/topic/health-sciences-and-technology) |
| MIT Neuroscience | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/rss/topic/neuroscience-neurology-and-cognitive-sciences) |
| MIT Robotics | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/topic/mitrobotics-rss.xml) |
| MIT Artificial Intelligence | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml) |
| MIT Political Science | Massachusetts Institute of Technology | research | [RSS/Atom](https://news.mit.edu/rss/topic/political-science) |
| Berkeley AI Research Blog | University of California Berkeley | research | [RSS/Atom](https://bair.berkeley.edu/blog/feed.xml) |
| Carnegie Mellon Machine Learning Blog | Carnegie Mellon University | research | [RSS/Atom](https://blog.ml.cmu.edu/feed/) |
| Harvard Gazette Science and Technology | Harvard University | research | [RSS/Atom](https://news.harvard.edu/gazette/section/science-technology/feed/) |
| Cambridge Research News | University of Cambridge | research | [RSS/Atom](https://www.cam.ac.uk/news-feed-generator.rss) |
| Tech Policy Press | Tech Policy Press | publisher | [RSS/Atom](https://techpolicy.press/rss/feed.xml) |
| Access Now | Access Now | publisher | [RSS/Atom](https://www.accessnow.org/feed/) |
| Center for Data Innovation | Information Technology and Innovation Foundation | publisher | [RSS/Atom](https://datainnovation.org/feed/) |
| MedTech Intelligence | Innovative Publishing | publisher | [RSS/Atom](https://www.medtechintelligence.com/feed/) |
| Healthcare Innovation | Endeavor B2B | publisher | [RSS/Atom](https://www.hcinnovationgroup.com/__rss/website-scheduled-content.xml?input=%7B%22sectionAlias%22%3A%22home%22%7D) |
| EFF Deeplinks | Electronic Frontier Foundation | publisher | [RSS/Atom](https://www.eff.org/rss/updates.xml) |
| War on the Rocks | War on the Rocks | publisher | [RSS/Atom](https://warontherocks.com/feed/) |
| Just Security | Just Security | publisher | [RSS/Atom](https://www.justsecurity.org/feed/) |
| StateScoop | Scoop News Group | publisher | [RSS/Atom](https://statescoop.com/feed/) |
| Government Technology | e.Republic | publisher | [RSS/Atom](https://www.govtech.com/index.rss) |
| Nextgov FCW | GovExec | publisher | [RSS/Atom](https://www.nextgov.com/rss/all/) |
| FedScoop | Scoop News Group | publisher | [RSS/Atom](https://fedscoop.com/feed/) |
| Atlantic Council | Atlantic Council | publisher | [RSS/Atom](https://www.atlanticcouncil.org/feed/) |
| Science Media Centre | Science Media Centre | publisher | [RSS/Atom](https://www.sciencemediacentre.org/feed/) |
| European Medical Journal | EMJ | publisher | [RSS/Atom](https://www.emjreviews.com/feed/) |
