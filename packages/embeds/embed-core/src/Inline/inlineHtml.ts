const html = `<div id="wrapper" style="top:50%; left:50%;transform:translate(-50%,-50%)" class="absolute z-highest">
<div class="loader border-brand-default darked:border-darkmodebrand">
	<span class="loader-inner bg-brand darked:bg-darkmodebrand"></span>
</div>
<div id="error" style="transform:translate(-50%,-50%)" class="hidden">
Something went wrong.
</div>
</div>
<slot></slot>`;
export default html;
