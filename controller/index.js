module.exports = function( req, res, controllers_data, tpl_data, next ){
	// populate tpl data
    tpl_data.title = "My Home Page";
    tpl_data.content = 'My Home Page Content';
    
    // call next
    next();
};