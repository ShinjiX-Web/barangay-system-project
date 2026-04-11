(function(){
    var canvas = document.getElementById('icon-cloud-canvas');
    if(!canvas) return;
    var ctx = canvas.getContext('2d');

    // Tech icons as image URLs from simple-icons CDN
    var iconSlugs = [
        'firebase','googlecloud','typescript','javascript','react',
        'html5','css3','nodedotjs','mongodb','postgresql',
        'git','github','figma','tailwindcss','bootstrap',
        'php','mysql','linux','docker','vite'
    ];

    var images = [], loaded = 0;
    iconSlugs.forEach(function(slug, i){
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = 'https://cdn.simpleicons.org/' + slug;
        img.onload = function(){ loaded++; };
        img.onerror = function(){ loaded++; };
        images[i] = img;
    });

    // Fibonacci sphere positions
    var NUM = iconSlugs.length;
    var positions = [];
    var offset = 2 / NUM, inc = Math.PI * (3 - Math.sqrt(5));
    for(var i=0;i<NUM;i++){
        var y = i*offset - 1 + offset/2;
        var r = Math.sqrt(1 - y*y);
        var phi = i*inc;
        positions.push({ x: Math.cos(phi)*r*160, y: y*160, z: Math.sin(phi)*r*160 });
    }

    var rot = { x: 0.3, y: 0 };
    var mouse = { x: 200, y: 200 };
    var drag = false, lastMouse = { x:0, y:0 };

    canvas.addEventListener('mousedown', function(e){
        drag=true; lastMouse={x:e.clientX,y:e.clientY};
    });
    canvas.addEventListener('mousemove', function(e){
        var r=canvas.getBoundingClientRect();
        mouse={x:e.clientX-r.left, y:e.clientY-r.top};
        if(drag){
            rot.y += (e.clientX-lastMouse.x)*0.003;
            rot.x += (e.clientY-lastMouse.y)*0.003;
            lastMouse={x:e.clientX,y:e.clientY};
        }
    });
    canvas.addEventListener('mouseup',  function(){ drag=false; });
    canvas.addEventListener('mouseleave',function(){ drag=false; });

    function draw(){
        requestAnimationFrame(draw);
        ctx.clearRect(0,0,500,500);

        // Auto-rotate when not dragging
        if(!drag){
            var cx=250,cy=250;
            var dx=mouse.x-cx, dy=mouse.y-cy;
            var dist=Math.sqrt(dx*dx+dy*dy)||1;
            var spd=0.0008+(dist/354)*0.002;
            rot.y += (dx/500)*spd*10;
            rot.x += (dy/500)*spd*10;
        }

        var cosX=Math.cos(rot.x), sinX=Math.sin(rot.x);
        var cosY=Math.cos(rot.y), sinY=Math.sin(rot.y);

        // Compute projected positions and sort back-to-front
        var projected = positions.map(function(p,i){
            var rx = p.x*cosY - p.z*sinY;
            var rz = p.x*sinY + p.z*cosY;
            var ry = p.y*cosX + rz*sinX;
            rz     = rz*cosX - p.y*sinX;
            return { sx:250+rx, sy:250+ry, rz:rz, i:i };
        });
        projected.sort(function(a,b){ return a.rz-b.rz; });

        projected.forEach(function(p){
            var scale   = (p.rz+260)/360;
            var opacity = Math.max(0.2, Math.min(1,(p.rz+200)/260));
            var sz = 42*scale;
            var img = images[p.i];
            ctx.save();
            ctx.globalAlpha = opacity;
            if(img && img.complete && img.naturalWidth){
                ctx.beginPath();
                ctx.arc(p.sx, p.sy, sz/2, 0, Math.PI*2);
                ctx.clip();
                ctx.drawImage(img, p.sx-sz/2, p.sy-sz/2, sz, sz);
            } else {
                ctx.beginPath();
                ctx.arc(p.sx, p.sy, sz/2, 0, Math.PI*2);
                ctx.fillStyle='rgba(129,140,248,'+(opacity)+')';
                ctx.fill();
            }
            ctx.restore();
        });
    }
    draw();
})();
