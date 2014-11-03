package controllers;

import play.*;
import play.mvc.*;
import play.data.*;
import static play.data.Form.*;
import play.data.validation.Constraints.*;
import views.html.*;
import models.*;
import play.db.*;
import java.sql.*;


public class Application extends Controller {

	// Reads Login form and see if ok
	public static Result authenticate() {
    	Form<LoginForm> loginForm = form(LoginForm.class).bindFromRequest();
		LoginData data = LoginData.makeLogin(loginForm.get());
        Connection conn = DB.getConnection();

    	return ok();
	}


    public static Result index() {
        return ok(login.render());
    }

    public static Result student() {
    	return ok(student.render());
    }

    public static Result teacher() {
    	return ok(teacher.render());
    }


}
