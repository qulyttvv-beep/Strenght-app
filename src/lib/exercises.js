// Built-in exercise library. Types: wr = weight x reps, br = bodyweight reps (+/- weight), time = seconds, cardio = minutes + distance.
// pat = movement pattern (used by the generator to avoid duplicates), pri = 1 staple compound ... 3 niche.

export const MUSCLES = {
  chest: { label: 'Chest', color: '#ff6b6b' },
  back: { label: 'Back', color: '#4dabf7' },
  shoulders: { label: 'Shoulders', color: '#ffa94d' },
  traps: { label: 'Traps', color: '#74c0fc' },
  biceps: { label: 'Biceps', color: '#da77f2' },
  triceps: { label: 'Triceps', color: '#f783ac' },
  forearms: { label: 'Forearms', color: '#b197fc' },
  abs: { label: 'Abs / Core', color: '#ffd43b' },
  quads: { label: 'Quads', color: '#69db7c' },
  hamstrings: { label: 'Hamstrings', color: '#38d9a9' },
  glutes: { label: 'Glutes', color: '#a9e34b' },
  calves: { label: 'Calves', color: '#3bc9db' },
  cardio: { label: 'Cardio', color: '#ff8787' },
  full: { label: 'Full body', color: '#ced4da' },
};
export const MUSCLE_ORDER = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'traps', 'forearms', 'cardio', 'full'];

export const EQUIPMENT = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable', bodyweight: 'Bodyweight', kettlebell: 'Kettlebell', band: 'Band', other: 'Other',
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const R = [];
// name, muscle, secondary, equip, mech, type, pattern, priority, cue
const x = (name, muscle, sec, equip, mech, type, pat, pri, cue) => R.push({ id: slug(name), name, muscle, sec: sec ? sec.split(',') : [], equip, mech, type, pat, pri, cue });

// ---- chest ----
x('Barbell Bench Press', 'chest', 'triceps,shoulders', 'barbell', 'compound', 'wr', 'hpress', 1, 'Shoulder blades pinched, feet planted. Lower to mid-chest, press up and slightly back.');
x('Incline Barbell Bench Press', 'chest', 'shoulders,triceps', 'barbell', 'compound', 'wr', 'ipress', 2, 'Bench at 30°. Bar touches upper chest; keep elbows ~45° from your torso.');
x('Dumbbell Bench Press', 'chest', 'triceps,shoulders', 'dumbbell', 'compound', 'wr', 'hpress', 1, 'Deep stretch at the bottom, press up and squeeze the chest together.');
x('Incline Dumbbell Press', 'chest', 'shoulders,triceps', 'dumbbell', 'compound', 'wr', 'ipress', 1, 'Bench 30°. Control the descent and stop when elbows are just below the bench.');
x('Machine Chest Press', 'chest', 'triceps,shoulders', 'machine', 'compound', 'wr', 'hpress', 2, 'Set the seat so handles line up with mid-chest. Push without shrugging.');
x('Incline Machine Press', 'chest', 'shoulders,triceps', 'machine', 'compound', 'wr', 'ipress', 3, 'Press up and in; keep your back glued to the pad.');
x('Dumbbell Fly', 'chest', 'shoulders', 'dumbbell', 'isolation', 'wr', 'fly', 2, 'Soft elbows. Open wide until you feel a stretch, then hug a barrel back up.');
x('Incline Dumbbell Fly', 'chest', 'shoulders', 'dumbbell', 'isolation', 'wr', 'fly', 3, 'Same arc as a fly on a 30° bench – targets the upper chest.');
x('Cable Fly', 'chest', 'shoulders', 'cable', 'isolation', 'wr', 'fly', 2, 'Step forward, slight lean. Sweep hands together at chest height and squeeze.');
x('Low-to-High Cable Fly', 'chest', 'shoulders', 'cable', 'isolation', 'wr', 'fly', 3, 'Start pulleys low, sweep up to eye level. Great for the upper chest.');
x('Pec Deck', 'chest', 'shoulders', 'machine', 'isolation', 'wr', 'fly', 2, 'Elbows level with shoulders. Squeeze hard for a one-second hold.');
x('Push-Up', 'chest', 'triceps,shoulders,abs', 'bodyweight', 'compound', 'br', 'pushup', 1, 'Body in one straight line. Chest to the floor, elbows ~45°.');
x('Incline Push-Up', 'chest', 'triceps,shoulders', 'bodyweight', 'compound', 'br', 'pushup', 3, 'Hands on a bench or box – an easier push-up variation to build up.');
x('Decline Push-Up', 'chest', 'shoulders,triceps', 'bodyweight', 'compound', 'br', 'ipress', 3, 'Feet elevated. Targets the upper chest and front delts.');
x('Chest Dip', 'chest', 'triceps,shoulders', 'bodyweight', 'compound', 'br', 'dip', 2, 'Lean forward, elbows flared slightly. Lower until you feel a deep chest stretch.');

// ---- back ----
x('Deadlift', 'back', 'glutes,hamstrings,traps,forearms', 'barbell', 'compound', 'wr', 'hinge', 1, 'Bar over mid-foot, flat back, push the floor away. Lock out with glutes, not your lower back.');
x('Barbell Row', 'back', 'biceps,traps', 'barbell', 'compound', 'wr', 'hrow', 1, 'Hinge to ~45°. Pull the bar to your lower ribs, squeeze shoulder blades.');
x('Pendlay Row', 'back', 'biceps,traps', 'barbell', 'compound', 'wr', 'hrow', 3, 'Torso parallel, bar returns to the floor each rep. Explosive pull, strict form.');
x('One-Arm Dumbbell Row', 'back', 'biceps', 'dumbbell', 'compound', 'wr', 'hrow', 1, 'Brace on a bench. Pull the elbow to your hip and pause at the top.');
x('Seated Cable Row', 'back', 'biceps,traps', 'cable', 'compound', 'wr', 'hrow', 1, 'Chest tall. Drive elbows back, squeeze, then let the shoulders stretch forward.');
x('Chest-Supported Row', 'back', 'biceps,traps', 'machine', 'compound', 'wr', 'hrow', 2, 'Chest on the pad removes momentum – pure back work. Pull elbows wide or tight.');
x('T-Bar Row', 'back', 'biceps,traps', 'barbell', 'compound', 'wr', 'hrow', 2, 'Neutral spine, pull the handle to your chest.');
x('Lat Pulldown', 'back', 'biceps', 'cable', 'compound', 'wr', 'vpull', 1, 'Lean back slightly, pull the bar to your upper chest, drive elbows down.');
x('Close-Grip Lat Pulldown', 'back', 'biceps', 'cable', 'compound', 'wr', 'vpull', 2, 'Neutral or close grip. Full stretch at the top, squeeze at the bottom.');
x('Pull-Up', 'back', 'biceps,forearms', 'bodyweight', 'compound', 'br', 'vpull', 1, 'Dead hang start. Pull your chest to the bar; control the way down.');
x('Chin-Up', 'back', 'biceps', 'bodyweight', 'compound', 'br', 'vpull', 1, 'Underhand grip, shoulder-width. Great for biceps and lats.');
x('Assisted Pull-Up', 'back', 'biceps', 'machine', 'compound', 'br', 'vpull', 2, 'Use assistance to get full-range reps; reduce it as you grow stronger.');
x('Inverted Row', 'back', 'biceps,traps', 'bodyweight', 'compound', 'br', 'hrow', 2, 'Body straight under a bar or rings. Pull your chest to the bar.');
x('Straight-Arm Pulldown', 'back', 'triceps', 'cable', 'isolation', 'wr', 'lat', 3, 'Arms almost straight, sweep the bar to your thighs. Feel the lats.');
x('Back Extension', 'back', 'glutes,hamstrings', 'bodyweight', 'isolation', 'br', 'extension', 2, 'Hinge at the hips, neutral spine; squeeze glutes at the top.');
x('Rack Pull', 'back', 'traps,glutes,forearms', 'barbell', 'compound', 'wr', 'hinge', 3, 'Deadlift from knee height. Overload the upper back and lockout.');
x('Meadows Row', 'back', 'biceps,traps', 'barbell', 'compound', 'wr', 'hrow', 3, 'Landmine row side-on. Big stretch and a powerful squeeze.');

// ---- shoulders ----
x('Overhead Press', 'shoulders', 'triceps,traps,abs', 'barbell', 'compound', 'wr', 'vpress', 1, 'Squeeze glutes and abs. Press the bar straight up, head through at the top.');
x('Seated Dumbbell Press', 'shoulders', 'triceps', 'dumbbell', 'compound', 'wr', 'vpress', 1, 'Back supported, press up and slightly in. Do not flare the ribs.');
x('Arnold Press', 'shoulders', 'triceps', 'dumbbell', 'compound', 'wr', 'vpress', 3, 'Rotate palms from facing you to facing forward as you press.');
x('Machine Shoulder Press', 'shoulders', 'triceps', 'machine', 'compound', 'wr', 'vpress', 2, 'Stable and joint-friendly. Press until arms are nearly straight.');
x('Push Press', 'shoulders', 'triceps,quads', 'barbell', 'compound', 'wr', 'vpress', 3, 'Dip and drive with the legs, finish with the arms. Great for power.');
x('Pike Push-Up', 'shoulders', 'triceps', 'bodyweight', 'compound', 'br', 'vpress', 2, 'Hips high in a V shape. Lower your head between your hands and press.');
x('Lateral Raise', 'shoulders', '', 'dumbbell', 'isolation', 'wr', 'latraise', 1, 'Slight lean, lead with the elbows to shoulder height. Light weight, no swinging.');
x('Cable Lateral Raise', 'shoulders', '', 'cable', 'isolation', 'wr', 'latraise', 2, 'Constant tension all the way through the range – excellent side-delt builder.');
x('Machine Lateral Raise', 'shoulders', '', 'machine', 'isolation', 'wr', 'latraise', 3, 'Push the pads out with your elbows; control the return.');
x('Front Raise', 'shoulders', '', 'dumbbell', 'isolation', 'wr', 'fraise', 3, 'Raise to eye level with straight arms. Do not use momentum.');
x('Rear Delt Fly', 'shoulders', 'back,traps', 'dumbbell', 'isolation', 'wr', 'reardelt', 1, 'Bent over, sweep arms out wide. Think “elbows to the walls”.');
x('Reverse Pec Deck', 'shoulders', 'back,traps', 'machine', 'isolation', 'wr', 'reardelt', 2, 'Chest on the pad, pull the handles back and out with straight-ish arms.');
x('Face Pull', 'shoulders', 'back,traps', 'cable', 'isolation', 'wr', 'reardelt', 1, 'Rope at face height. Pull to your forehead, rotate hands outward, squeeze.');
x('Upright Row', 'shoulders', 'traps,biceps', 'barbell', 'compound', 'wr', 'uprow', 3, 'Wide grip, pull to chest height only. Stop if the shoulders pinch.');
x('Landmine Press', 'shoulders', 'chest,triceps', 'barbell', 'compound', 'wr', 'vpress', 3, 'Press the barbell tip up and forward. Shoulder-friendly angle.');

// ---- traps ----
x('Barbell Shrug', 'traps', 'forearms', 'barbell', 'isolation', 'wr', 'shrug', 2, 'Straight up toward the ears, hold a second. No rolling.');
x('Dumbbell Shrug', 'traps', 'forearms', 'dumbbell', 'isolation', 'wr', 'shrug', 2, 'Heavy dumbbells at your sides. Shrug and squeeze.');
x("Farmer's Walk", 'traps', 'forearms,abs', 'dumbbell', 'compound', 'cardio', 'carry', 3, 'Heavy dumbbells, tall posture, brisk steps. Grip and traps on fire.');

// ---- biceps ----
x('Barbell Curl', 'biceps', 'forearms', 'barbell', 'isolation', 'wr', 'curl', 1, 'Elbows pinned to your sides. Curl up and squeeze, lower slowly.');
x('EZ-Bar Curl', 'biceps', 'forearms', 'barbell', 'isolation', 'wr', 'curl', 2, 'Easier on the wrists than a straight bar.');
x('Dumbbell Curl', 'biceps', 'forearms', 'dumbbell', 'isolation', 'wr', 'curl', 1, 'Supinate (turn your palm up) as you curl. No swinging.');
x('Hammer Curl', 'biceps', 'forearms', 'dumbbell', 'isolation', 'wr', 'hammer', 1, 'Neutral grip hits the brachialis and forearms for thicker arms.');
x('Incline Dumbbell Curl', 'biceps', '', 'dumbbell', 'isolation', 'wr', 'curl', 2, 'Lie back on a 45° bench – a big stretch on the long head.');
x('Preacher Curl', 'biceps', '', 'machine', 'isolation', 'wr', 'curl', 2, 'Upper arms on the pad. Full stretch at the bottom, no bouncing.');
x('Cable Curl', 'biceps', 'forearms', 'cable', 'isolation', 'wr', 'curl', 2, 'Constant tension. Keep elbows still and squeeze at the top.');
x('Concentration Curl', 'biceps', '', 'dumbbell', 'isolation', 'wr', 'curl', 3, 'Seated, elbow braced on your thigh. Slow, strict peak contraction.');

// ---- triceps ----
x('Close-Grip Bench Press', 'triceps', 'chest,shoulders', 'barbell', 'compound', 'wr', 'tripress', 1, 'Hands shoulder-width, elbows tucked. A heavy triceps builder.');
x('Triceps Pushdown', 'triceps', '', 'cable', 'isolation', 'wr', 'tripush', 1, 'Elbows at your sides. Push down to full extension and squeeze.');
x('Rope Pushdown', 'triceps', '', 'cable', 'isolation', 'wr', 'tripush', 2, 'Spread the rope at the bottom for an extra squeeze.');
x('Overhead Triceps Extension', 'triceps', '', 'dumbbell', 'isolation', 'wr', 'trioh', 1, 'Elbows close to your ears. Deep stretch for the long head.');
x('Cable Overhead Extension', 'triceps', '', 'cable', 'isolation', 'wr', 'trioh', 2, 'Face away from the stack. Extend fully, keep ribs down.');
x('Skull Crusher', 'triceps', '', 'barbell', 'isolation', 'wr', 'trioh', 2, 'Lower the bar to your forehead, elbows pointing at the ceiling.');
x('Triceps Dip', 'triceps', 'chest,shoulders', 'bodyweight', 'compound', 'br', 'dip', 1, 'Upright torso, elbows back. Lower to 90° and drive up.');
x('Bench Dip', 'triceps', 'shoulders', 'bodyweight', 'compound', 'br', 'dip', 3, 'Hands on a bench behind you. Keep your hips close to the bench.');
x('Diamond Push-Up', 'triceps', 'chest,shoulders', 'bodyweight', 'compound', 'br', 'pushup', 3, 'Hands form a diamond under your chest. Elbows in tight.');
x('Triceps Kickback', 'triceps', '', 'dumbbell', 'isolation', 'wr', 'tripush', 3, 'Hinge forward, upper arm parallel to the floor, extend and squeeze.');

// ---- forearms ----
x('Wrist Curl', 'forearms', '', 'barbell', 'isolation', 'wr', 'wrist', 3, 'Forearms on your thighs. Curl the weight with the wrists only.');
x('Reverse Wrist Curl', 'forearms', '', 'barbell', 'isolation', 'wr', 'wrist', 3, 'Palms down. Lift with the back of the forearm.');
x('Reverse Curl', 'forearms', 'biceps', 'barbell', 'isolation', 'wr', 'curl', 3, 'Overhand grip for forearms and brachioradialis.');
x('Dead Hang', 'forearms', 'back', 'bodyweight', 'isolation', 'time', 'hang', 3, 'Hang from a bar with an active shoulder. Build grip and decompress the spine.');

// ---- abs ----
x('Plank', 'abs', 'shoulders', 'bodyweight', 'isolation', 'time', 'plank', 1, 'Forearms down, body in one line. Squeeze glutes and abs; do not sag.');
x('Side Plank', 'abs', 'shoulders', 'bodyweight', 'isolation', 'time', 'plank', 2, 'Stack the feet, lift the hips, hold. Strong obliques.');
x('Crunch', 'abs', '', 'bodyweight', 'isolation', 'br', 'crunch', 2, 'Curl ribs toward hips – a small controlled range, exhale at the top.');
x('Cable Crunch', 'abs', '', 'cable', 'isolation', 'wr', 'crunch', 1, 'Kneel and curl your spine down, hips still. Loadable ab work.');
x('Hanging Leg Raise', 'abs', 'forearms', 'bodyweight', 'isolation', 'br', 'legraise', 1, 'Tuck your pelvis and lift your legs without swinging.');
x('Hanging Knee Raise', 'abs', 'forearms', 'bodyweight', 'isolation', 'br', 'legraise', 2, 'An easier hanging variation. Curl the pelvis up.');
x('Lying Leg Raise', 'abs', '', 'bodyweight', 'isolation', 'br', 'legraise', 3, 'Lower back pressed down, legs low but controlled.');
x('Ab Wheel Rollout', 'abs', 'shoulders', 'other', 'compound', 'br', 'rollout', 2, 'Roll out with a braced core and a posterior pelvic tilt, pull back with the abs.');
x('Russian Twist', 'abs', '', 'bodyweight', 'isolation', 'br', 'rotation', 3, 'Lean back slightly and rotate through the ribcage.');
x('Bicycle Crunch', 'abs', '', 'bodyweight', 'isolation', 'br', 'crunch', 3, 'Slow elbow-to-knee reps with the opposite leg extended.');
x('Sit-Up', 'abs', '', 'bodyweight', 'isolation', 'br', 'crunch', 3, 'Controlled all the way up and down.');
x('Dead Bug', 'abs', '', 'bodyweight', 'isolation', 'br', 'antiext', 2, 'Low back flat, opposite arm and leg reach out slowly.');
x('Pallof Press', 'abs', 'shoulders', 'cable', 'isolation', 'wr', 'antirot', 2, 'Press the cable out and resist rotating. Core anti-rotation.');
x('Cable Woodchop', 'abs', 'shoulders', 'cable', 'isolation', 'wr', 'rotation', 3, 'Rotate through the torso from high to low, arms stay long.');
x('Mountain Climber', 'abs', 'quads,shoulders', 'bodyweight', 'compound', 'time', 'plank', 3, 'Plank position, drive knees to the chest quickly.');

// ---- quads ----
x('Barbell Back Squat', 'quads', 'glutes,hamstrings,abs', 'barbell', 'compound', 'wr', 'squat', 1, 'Brace, sit between your hips, knees track over toes, drive up through mid-foot.');
x('Front Squat', 'quads', 'glutes,abs', 'barbell', 'compound', 'wr', 'squat', 2, 'Elbows high, torso upright. Quad dominant and core heavy.');
x('Goblet Squat', 'quads', 'glutes,abs', 'dumbbell', 'compound', 'wr', 'squat', 1, 'Hold one dumbbell at the chest. A great way to learn the squat.');
x('Leg Press', 'quads', 'glutes,hamstrings', 'machine', 'compound', 'wr', 'legpress', 1, 'Feet shoulder-width. Lower until your hips begin to tuck, press without locking out hard.');
x('Hack Squat', 'quads', 'glutes', 'machine', 'compound', 'wr', 'squat', 2, 'Back on the pad, feet forward. Deep range of motion for the quads.');
x('Leg Extension', 'quads', '', 'machine', 'isolation', 'wr', 'legext', 1, 'Pause and squeeze at the top. Great finisher for the quads.');
x('Bulgarian Split Squat', 'quads', 'glutes,hamstrings', 'dumbbell', 'compound', 'wr', 'lunge', 1, 'Back foot on a bench, drop straight down. Brutally effective.');
x('Walking Lunge', 'quads', 'glutes,hamstrings', 'dumbbell', 'compound', 'wr', 'lunge', 2, 'Long strides, upright torso, knee just above the floor.');
x('Reverse Lunge', 'quads', 'glutes,hamstrings', 'dumbbell', 'compound', 'wr', 'lunge', 2, 'Step back and lower – knee-friendly and glute-focused.');
x('Step-Up', 'quads', 'glutes', 'dumbbell', 'compound', 'wr', 'lunge', 3, 'Drive through the heel of the top foot; do not push off the floor leg.');
x('Bodyweight Squat', 'quads', 'glutes', 'bodyweight', 'compound', 'br', 'squat', 1, 'Chest up, sit deep, drive up. High reps work well.');
x('Jump Squat', 'quads', 'glutes,calves', 'bodyweight', 'compound', 'br', 'squat', 3, 'Land softly and reset each rep. Power and conditioning.');
x('Wall Sit', 'quads', 'glutes', 'bodyweight', 'isolation', 'time', 'legext', 3, 'Back flat on the wall, thighs parallel to the floor.');
x('Smith Machine Squat', 'quads', 'glutes', 'machine', 'compound', 'wr', 'squat', 3, 'Feet slightly forward of the bar; fixed path makes it stable.');

// ---- hamstrings ----
x('Romanian Deadlift', 'hamstrings', 'glutes,back', 'barbell', 'compound', 'wr', 'rdl', 1, 'Soft knees, hips back, bar slides down your thighs. Feel the hamstring stretch.');
x('Dumbbell Romanian Deadlift', 'hamstrings', 'glutes,back', 'dumbbell', 'compound', 'wr', 'rdl', 1, 'Push your hips back and keep the dumbbells close to your legs.');
x('Lying Leg Curl', 'hamstrings', 'calves', 'machine', 'isolation', 'wr', 'legcurl', 1, 'Curl heels to glutes, control the lowering.');
x('Seated Leg Curl', 'hamstrings', '', 'machine', 'isolation', 'wr', 'legcurl', 1, 'Seated position gives a bigger hamstring stretch than lying.');
x('Nordic Curl', 'hamstrings', '', 'bodyweight', 'isolation', 'br', 'legcurl', 3, 'Anchor your feet and lower as slowly as you can. Advanced hamstring work.');
x('Single-Leg Romanian Deadlift', 'hamstrings', 'glutes,abs', 'dumbbell', 'compound', 'wr', 'rdl', 3, 'Hinge on one leg, back leg extends. Balance and hamstring strength.');
x('Good Morning', 'hamstrings', 'back,glutes', 'barbell', 'compound', 'wr', 'rdl', 3, 'Bar on your back, hinge until your torso is near parallel.');
x('Glute-Ham Raise', 'hamstrings', 'glutes,back', 'bodyweight', 'compound', 'br', 'legcurl', 3, 'Lower with control and curl up using the hamstrings.');

// ---- glutes ----
x('Barbell Hip Thrust', 'glutes', 'hamstrings', 'barbell', 'compound', 'wr', 'thrust', 1, 'Upper back on a bench. Drive hips up, chin tucked, squeeze for a second.');
x('Dumbbell Hip Thrust', 'glutes', 'hamstrings', 'dumbbell', 'compound', 'wr', 'thrust', 2, 'Same motion with a dumbbell on your hips – easy to set up at home.');
x('Glute Bridge', 'glutes', 'hamstrings', 'bodyweight', 'compound', 'br', 'thrust', 1, 'Feet close, drive your hips up and squeeze at the top.');
x('Cable Glute Kickback', 'glutes', '', 'cable', 'isolation', 'wr', 'kickback', 2, 'Hinge slightly, kick back and squeeze. No lower-back arching.');
x('Hip Abduction Machine', 'glutes', '', 'machine', 'isolation', 'wr', 'abduct', 3, 'Lean forward slightly to hit the glute medius.');
x('Sumo Deadlift', 'glutes', 'quads,hamstrings,back', 'barbell', 'compound', 'wr', 'hinge', 3, 'Wide stance, toes out, chest up. Spread the floor with your feet.');
x('Banded Lateral Walk', 'glutes', '', 'band', 'isolation', 'time', 'abduct', 3, 'Band above the knees, stay low and step sideways.');

// ---- calves ----
x('Standing Calf Raise', 'calves', '', 'machine', 'isolation', 'wr', 'calf', 1, 'Full stretch at the bottom, pause at the top. Slow tempo.');
x('Seated Calf Raise', 'calves', '', 'machine', 'isolation', 'wr', 'calf', 2, 'Bent knees emphasise the soleus muscle.');
x('Single-Leg Calf Raise', 'calves', '', 'bodyweight', 'isolation', 'br', 'calf', 2, 'On a step, full range, one leg at a time.');
x('Leg Press Calf Raise', 'calves', '', 'machine', 'isolation', 'wr', 'calf', 3, 'Press through the balls of your feet and stretch fully.');

// ---- cardio / conditioning ----
x('Running', 'cardio', 'quads,calves', 'other', 'compound', 'cardio', 'cardio', 2, 'Easy conversational pace for base, intervals for speed.');
x('Treadmill Walk (Incline)', 'cardio', 'glutes,calves', 'machine', 'compound', 'cardio', 'cardio', 1, '10–12% incline at 5–6 km/h – low impact, high payoff.');
x('Walking', 'cardio', 'quads,calves', 'other', 'compound', 'cardio', 'cardio', 1, 'The most underrated fat-loss tool. Aim for daily steps.');
x('Cycling', 'cardio', 'quads', 'machine', 'compound', 'cardio', 'cardio', 2, 'Steady state or intervals. Easy on the joints.');
x('Rowing Machine', 'cardio', 'back,quads', 'machine', 'compound', 'cardio', 'cardio', 2, 'Legs, hips, arms – in that order. Keep the strokes smooth.');
x('Elliptical', 'cardio', '', 'machine', 'compound', 'cardio', 'cardio', 3, 'Low-impact cardio. Keep the resistance challenging.');
x('Stair Climber', 'cardio', 'glutes,quads', 'machine', 'compound', 'cardio', 'cardio', 3, 'Stand tall, do not lean on the rails.');
x('Jump Rope', 'cardio', 'calves,shoulders', 'other', 'compound', 'cardio', 'cardio', 2, 'Stay on the balls of your feet, small hops.');
x('Burpee', 'full', 'chest,quads,shoulders', 'bodyweight', 'compound', 'br', 'conditioning', 3, 'Squat, kick back, push-up, jump. Pace yourself.');
x('Kettlebell Swing', 'full', 'glutes,hamstrings,back', 'kettlebell', 'compound', 'wr', 'swing', 2, 'A hinge, not a squat. Snap your hips and let the bell float.');
x('Dumbbell Thruster', 'full', 'quads,shoulders,glutes', 'dumbbell', 'compound', 'wr', 'conditioning', 3, 'Front squat straight into an overhead press.');
x('Battle Ropes', 'full', 'shoulders,abs', 'other', 'compound', 'time', 'conditioning', 3, 'Alternate waves, stay low. Short, intense intervals.');

export const EXERCISES = R;
export const BUILTIN = Object.fromEntries(R.map((e) => [e.id, e]));

// custom exercises are registered by the store at runtime
let custom = {};
export const registerCustom = (list) => { custom = Object.fromEntries((list || []).map((e) => [e.id, e])); };
export const getExercise = (id) => custom[id] || BUILTIN[id] || { id, name: id.replace(/-/g, ' '), muscle: 'full', sec: [], equip: 'other', mech: 'compound', type: 'wr', cue: '' };
export const allExercises = () => [...Object.values(custom), ...R];

export const TYPE_LABEL = { wr: 'Weight & reps', br: 'Bodyweight reps', time: 'Duration', cardio: 'Cardio' };
