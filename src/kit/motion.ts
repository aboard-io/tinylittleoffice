/**
 * Pages that move. An animation drawn into a page (the Animator's view, placed on a slide or in a text)
 * plays by SMIL: the SVG animates itself, no script needed. What a script adds is when: a slide that comes
 * on starts its animations from the beginning, one that goes off is paused (a deck
 * of ten animations runs no ten clocks), and with "reduce motion" asked of the system every animation
 * stands at its resting moment, where a once-through ends. All by the <svg> element's own clock
 * (setCurrentTime, pauseAnimations, unpauseAnimations): an outermost <svg> holds the clock of everything
 * inside it, a placed page's nested <svg> included. Chromium never moves an animation that was under
 * `display: none` when the page loaded (a slide not on), whatever its clock says,
 * until the <svg> is put in the page again: so one that comes on is put back where it is, first.
 *
 * motion() is for the kit and the editors; MOTION_JS is the same function as a fixed text, for the pages
 * the apps make (a deck's slideshow), whose scripts are registered with kit/page.ts by their text.
 */

/** Every outermost <svg> under a node: each holds one clock. */
const OUTER = 'svg:not(svg svg)';
const ANIMATIONS = 'animate,animateTransform,animateMotion,set';

/** Whether the system asks for less motion. */
export const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The resting moment of an <svg>'s animations, in seconds: where its longest once-through ends (a round of one that repeats for ever). */
export function restOf(svg: SVGSVGElement): number {
  let end = 0;
  for (const a of svg.querySelectorAll<SVGAnimationElement>(ANIMATIONS)) {
    let d = 0;
    try {
      d = a.getSimpleDuration();
    } catch {
      // An indefinite duration has no end to rest at.
    }
    const n = parseFloat(a.getAttribute('repeatCount') ?? '') || 1;
    if (Number.isFinite(d)) end = Math.max(end, d * n);
  }
  // A hair before the end, so a round that repeats shows its last moment rather than its first again.
  return Math.max(0, end - 0.001);
}

/** The pages under `root` come on (`on`: their animations start from the beginning, or rest where they end with reduced motion) or go off (paused). */
export function motion(root: ParentNode, on: boolean): void {
  const still = on && reducedMotion();
  for (const svg of root.querySelectorAll<SVGSVGElement>(OUTER)) {
    if (!svg.pauseAnimations || !svg.querySelector(ANIMATIONS)) continue;
    if (!on) {
      svg.pauseAnimations();
      continue;
    }
    svg.parentNode?.insertBefore(svg, svg.nextSibling);
    if (still) (svg.setCurrentTime(restOf(svg)), svg.pauseAnimations());
    else (svg.setCurrentTime(0), svg.unpauseAnimations());
  }
}

/** motion() for a page's own script: a fixed text (ES5, as every page script is), defining `motion(root, on)`. */
export const MOTION_JS = `function motion(root,on){
var still=on&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
[].forEach.call(root.querySelectorAll('${OUTER}'),function(s){if(!s.pauseAnimations||!s.querySelector('${ANIMATIONS}'))return;
if(!on){s.pauseAnimations();return;}
s.parentNode.insertBefore(s,s.nextSibling);
if(still){var e=0;[].forEach.call(s.querySelectorAll('${ANIMATIONS}'),function(a){var d=0;try{d=a.getSimpleDuration();}catch(x){}var n=parseFloat(a.getAttribute('repeatCount'))||1;if(isFinite(d))e=Math.max(e,d*n);});s.setCurrentTime(Math.max(0,e-0.001));s.pauseAnimations();return;}
s.setCurrentTime(0);s.unpauseAnimations();});}
`;
