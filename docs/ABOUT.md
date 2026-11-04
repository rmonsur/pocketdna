# PocketDNA General Plan

- Meta Global AI Developer Hackathon | Oct 26 - Nov 4, 2026 | Indie Developer Track (solo)
- Submission deadline: November 4, 9:00 PM EST/8:00 AM GMT +6 DHAKA time on this machine. Internal deadline: November 4, 2:00 PM EST.
- Track: Indie Developer Track
- Builder: Solo Participant (leveraging Muse Code as force-multiplier)


## One-liner

PocketDNA is Finding Your Roots for everyone: drop your DNA test and get a micro documentary of your origins. 

PocketDNA is a website that helps 50 million + people who have taken DNA test create their own custom micro Finding Your Roots episode at a fraction of the cost. 


## The Problem

50 million people have taken DNA tests globally. Hundreds and thousands of people post screenshots of their DNA test results in Facebook Groups and subreddits asking "what does this mean?" hoping a knowledgeable stranger replies. The alternative is a professional genetic genealogist who charges $2,000 per case. There are many existing deep-ancestry tools (MyTrueAncestry, IllustrativeDNA, Genoplot) that show dry dashboards with no interpretation and no narrative. What people want is a story of who they are. 

Meanwhile, we are going through a golden age of paleogenomics, led by David Reich's lab at Harvard and the Allen Ancient DNA Resource (AADR), which has sequenced over 10,000 ancient human skeletons and published over 15,000 ANCIENT DNA (aDNA) samples. However, deep ancestry insights are locked behind UNIX command-line tools (PLINK, EIGENSOFT/smartpca, qpAdm) and dense academic PDFs in Nature and Science. There are some genetics bloggers like Davidski and Razib Khan who offer tools and blog posts for interpretation but there still exists a large gap beteween what people want and what currently is being served. 



## Hackathon Problem statement fit

Build for Your World: a domain problem the builder knows firsthand (prior project
DNAless; personal demo uses builder's own DNA). Secondary resonance with Push the Frontier via the real bioinformatics pipeline.


## The Product

A website where a person can drop their DNA raw data file or DNA test result screenshot and get a 90-150 second reel episode of their origin at a tap of a button. Judges run it locally from the repo. 

The user provides DNA results either via screenshot or actual raw DNA text file upload (supprt 23andMe and AncestryDNA only for now) and PocketDNA produces a chaptered, narrated, visually produced micro documentary of their origins (90 second to 150 second max, 9:16 vertical ratio), with every factual claim grounded in cited literature powered by Muse Spark which runs live search. The product generates DNA based ancestry analysis, maps, images all tied into a compelling narrative via the shorts/reels documentary. 

Underneath, a fleet of agents running in a graph network (divided across three classes: orchestrator, worker, auditor) powered by Muse Spark collaborate to fetch information, create images, write the script, build the scene and direct the reel micro episode. 

Muse Images model is used to generate images. Muse Wonder is used to manage the bioinformatics pipeline. 

## Execution 


### User inputs

| Tier | Input | Pipeline | What it proves |
|------|-------|----------|----------------|
| 1 | Screenshot of 23andMe, AncestryDNA, MyHeritage results | Muse Spark vision parses the image into structured ancestry data | Zero-friction entry; meets users where they are (the screenshot-posting behavior) |
| 2 | Raw genotype file (23andMe or AncestryDNA .txt or .zip)| Deep-time ancestry engine: user genotypes projected onto a precomputed 25-PC AADR eigenspace (basis built at build time, validated against EIGENSOFT smartpca as oracle), then 3-epoch constrained NNLS mixture fit (Bronze Age, Middle Ages, Modern). |

### Output

A 90-150 second, 9:16, auto-generated cinematic reel. Imagine Spotify Wrapped meets a
Nat Geo/Ken Burns sequence with a tappable evidence layer underneath. Stunning sleek visuals and short beats. 

Users can pause and replay, with the information clickable. The user can request explainers and find citation. Muse Spark distills dense scientific literature into easy to consume pieces tying them all under an unified grand narrative about their origin. 

Each output is:
- 90-150 seconds strict
- starts with a hook (your oldest/rarest MOST INTERESTING signal) 
- method-credibility beat (marker counts, N ancient genomes compared) 
- 3 eras (Bronze Age, Middle Ages, Modern period) 
- convergence map (all paths lead to you) 
- share stamp (Instagram/Threads/Facebook reels and stories)

Each era: 20-30 second full-bleed period scene (from the pregenerated Muse Image library; on-the-fly generation for uncommon populations in Tier 1 only, Tier 2 is library-only) with slow push, inset animated map path, kinetic typography (Inter display) carrying ONE cited claim plus a short plain-language explainer of what the result means. Core reel is silent; kinetic type carries narration.
  
Engine: our own t-driven scene engine (every element a pure function of time t, inspired by the html-reel clock pattern (check SKILLS.md) but written by Muse Code). Muse Spark authors each user's reel JSON (beats, copy, map coords, timings) against it

Playback: in-app via WebView (identical on web); MP4 export as a Modal job (headless browser; steps t frame-by-frame -> ffmpeg) feeding the share/viral loop

Content: 
- Images of Ancestral components (e.g Anatolian Neolithic Farmer, Medieval Anatolian, Modern Turkish): Muse Image generated tasteful cinematic photography of ethnic and cultural groups
- Animation: movement of ancestral components across a globe/atlas,each component represented by a circular icon (like circular profile picture in social media sites) showing at each era the ancestral components coalescing together
- Text explanation of what is happening powered by Muse directed script
- Clickable text: users can pause, click the text and find explainer of their origin stories backed by citation
- [CRITICAL]: WHEN THE USER CAN CLICK THE TEXT ON VIDEO: tooltip appears EXPLAINING WHY THEY HAVE THIS PARTICULAR ANCESTRY COMPOSITION. THE WHY IS CRITICAL. 
- BROADER PROINT: DNA tests offer the what, we offer the why and how via our script and storytelling. 


### Bioinformatics Pipeline

For screenshots: simulated ancestry by parsing the screenshots, finding relevant G25 coordinate value for each ancestry component (e.g English 75% French 10%, Swedish 15%), and creating a synethic G25 coordinate out of those component coordinates and then finding ancestry splits across three different eras. 

For raw data: The 23andMe or Ancestry raw data file is parsed, compared against SNP selection of precomputed custom G25 dataset (deived from AADR, EGDP, SGDP using same mathetmatic formula as original G25), then projected into eigenspace to derive G25 coordinates. Once done, the G25 coordinate is fed to ancestry calculators like the screenshot pipeline to find ancestry splits across three different eras. 

### Muse model usage map


### Critical scientific honesty rule

The LLM never computes ancestry at inference time. The math is deterministic population
genetics: a PCA-projection + mixture-fitting engine or the vendor's own published percentages from screenshot. Muse does what previously required a human expert: interpretation, narrative, visuals, and cited storytelling. 


## Hard boundaries (see RULES.md)

- CRITICAL: Easy one command install so the judge doesnt have to spend minutes debugging 
- No health/trait interpretation ever. Health panels in screenshots are detected and rejected with a clear message. Ancestry only.
- Demo data: builder's own DNA (hero demo) + screenshots shared directly with the builder by members of Facebook ancestry groups the builder admins, personal information redacted. 
- Public repo from day one; all work during the event window.


## Related docs

- RULES.md — hackathon compliance + engineering rules
- STACK.md — architecture, services, credits budget
- DESIGN.md — visual direction and per-feature quality references
- USER_FLOW.md — screens and flows
- AGENTS_PIPELINE.md — runtime and build-time agent architecture (one agent, one task)
- SKILLS.md - open source libraries of skills, UI components to fast track the build
- UI-COMPONENTS.md — component-level spec sheet with acceptance criteria and build order
- CHECKLIST.md — living spec sheet and project management tracker