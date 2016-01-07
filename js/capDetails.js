// JavaScript Document

$('#capsdetail').click(function(){
	alert("This dialog");
				    $('#dialog').dialog('open');
 
 
					return false;
				});
				
function openProductDetails(){
	var img = document.getElementById('discCap').name;
	
	if(img==='discCap'){
		alert("This is a disc cap:" + img);
	}
        
	//alert("This dialog:" + img);
	
	$('#dialog').dialog('open');
 
 
					return false;
				};