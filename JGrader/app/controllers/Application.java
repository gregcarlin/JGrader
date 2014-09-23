package controllers;

import play.*;
import play.mvc.*;
import play.data.*;
import static play.data.Form.*;

import views.html.*;



public class Application extends Controller {

	// Stores Login Information
	public static class Login{
		public String email;
		public String password;

		// Sends back error string if something is wrong
		public String validate() {
		    return null;
		}
	}	

	// Reads Login form and see if ok
	public static Result authenticate() {
    	Form<Login> loginForm = form(Login.class).bindFromRequest();
    	return ok();
	}


    public static Result index() {
        return ok(login.render(form(Login.class)));
    }

    public static Result student() {
    	return ok(student.render());
    }

    public static Result teacher() {
    	return ok(teacher.render());
    }

    
}
