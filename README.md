# Goal

- Make it easy to create a "scaffolding", a video with mostly virtual elements.


# Design questions




# MVP TODO

## m3
- X: Measure AudioSpeechNode duration accurately.
- Remove nodes
- Move nodes around
- Edit nodes

## m4
- Video File Node
  - For now, each node will have a hidden video html; we can share if resource is exhausted.
## m5
- Create a home page to access it

## Deferred to screen capture
- Record it and save the artifact
  - SpeechSynthesis API can't be hooked up to Web Audio API
  - Getting audio output from the same tab is only possible in FireFox.
    - https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices
  - Another idea is to just use screen capture from another app.

# MVP Done

## m0
- X Create a visual text node
- X Create an audio speech node
- X Save it

## m1
- X Visualize it

## m2
- X Play it

# More TODO
## P1

Explore SSML

```
<speak>
    <prosody rate="slow" pitch="0%">Can you hear me now?</prosody>
    <break time="800ms"/>
    <prosody rate="slow" pitch="+20%">Can you hear me now?</prosody>
    <break time="800ms"/>
    <prosody rate="slow" pitch="+40%">Can you hear me now?</prosody>
    <break time="800ms"/>
    <prosody rate="slow" pitch="-20%">Can you hear me now?</prosody>
    <break time="800ms"/>
    <prosody rate="slow" pitch="-40%">Can you hear me now?</prosody>
</speak>
```


```
<speak>
  I say tomato.
  You say tomaahto
</speak>
```

## P2

- Think of when to clone and when to reference
  - My preference is to clone to avoid surprises but have a way of doing find-and-replace like in text editing when things that are cloned but not yet modified.
  - Idea 2: use a reference field and a is_strong_reference field.